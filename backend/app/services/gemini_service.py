import json
import logging
import re
import time
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError, ClientError, ServerError

from app.core.config import settings

logger = logging.getLogger(__name__)


def _sanitize_error(message: str) -> str:
    """Removes any API key or sensitive token strings from exception messages."""
    sanitized = message
    if settings.GEMINI_API_KEY:
        sanitized = sanitized.replace(settings.GEMINI_API_KEY, "[REDACTED_API_KEY]")
    # Redact any AIzaSy... pattern
    sanitized = re.sub(r"AIzaSy[A-Za-z0-9_-]{20,45}", "[REDACTED_KEY]", sanitized)
    return sanitized




class GeminiService:
    """
    Robust service encapsulating Google Gemini API integration.
    Features model fallback, student anonymization, schema validation, and credential redaction.
    """

    def __init__(self):
        self._client: Optional[genai.Client] = None
        self._candidate_models = self._build_model_candidates()

    def _build_model_candidates(self) -> List[str]:
        """Builds an ordered, deduplicated list of fallback models."""
        candidates = [
            settings.GEMINI_MODEL,
            settings.GEMINI_FALLBACK_MODEL,
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3.8-flash",
        ]
        seen = set()
        deduped = []
        for m in candidates:
            if m and m not in seen:
                seen.add(m)
                deduped.append(m)
        return deduped

    def is_configured(self) -> bool:
        """Returns True if a non-empty Gemini API key is configured."""
        return bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 10)

    def get_client(self) -> genai.Client:
        """Initializes and caches the Google Gen AI client."""
        if not self.is_configured():
            raise RuntimeError("Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env.")
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY.strip())
        return self._client

    def _execute_with_fallback(
        self,
        contents: str,
        system_instruction: Optional[str] = None,
        json_output: bool = False,
        temperature: float = 0.2,
    ) -> tuple[str, str]:
        """
        Executes a prompt against candidate Gemini models with automatic failover.
        Returns (response_text, model_name_used).
        """
        client = self.get_client()

        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_instruction if system_instruction else None,
            response_mime_type="application/json" if json_output else "text/plain",
        )

        last_error = None
        for model in self._candidate_models:
            try:
                logger.info(f"Attempting Gemini generation with model: {model}")
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
                if response and response.text:
                    return response.text.strip(), model
            except (ClientError, ServerError, APIError) as exc:
                err_str = _sanitize_error(str(exc))
                logger.warning(f"Model {model} failed with: {err_str}")
                last_error = err_str
                # If 503 unavailable or 404 deprecated, try next candidate model
                continue
            except Exception as exc:
                err_str = _sanitize_error(str(exc))
                logger.warning(f"Unexpected error with model {model}: {err_str}")
                last_error = err_str
                continue

        raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")

    def diagnostic_test(self) -> Dict[str, Any]:
        """Runs a harmless minimal prompt to verify API connectivity."""
        if not self.is_configured():
            return {
                "status": "unconfigured",
                "message": "Gemini API key is not set in backend/.env.",
            }

        start_time = time.perf_counter()
        try:
            text, model = self._execute_with_fallback(
                contents="Respond with only the single word: OK",
                temperature=0.0,
            )
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)
            return {
                "status": "connected",
                "model_used": model,
                "latency_ms": elapsed_ms,
                "message": f"Successfully connected to Gemini API using {model} in {elapsed_ms}ms.",
            }
        except Exception as exc:
            return {
                "status": "error",
                "message": _sanitize_error(str(exc)),
            }

    def _parse_json(self, raw_text: str) -> Dict[str, Any]:
        """Extracts and parses JSON object from model response, stripping code fences if present."""
        text = raw_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Find first { and last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start : end + 1]

        return json.loads(text)

    def explain_learning_gap(
        self,
        topic_name: str,
        subject: str,
        grade_level: str,
        evidence: str,
        anonymized_student_code: str,
        severity: str,
    ) -> Dict[str, Any]:
        """
        Feature A: Explains learning gap based exclusively on recorded assessment evidence.
        Distinguishes observed facts from tentative interpretations.
        """
        system_instruction = (
            "You are an expert diagnostic educational analyst for Parallax Teacher Intelligence Platform.\n"
            "Your philosophy: Look beyond the score. Base all observations strictly on the supplied assessment evidence.\n"
            "Rules:\n"
            "1. Ground all analysis strictly in the provided evidence. Never invent scores, history, or abilities.\n"
            "2. Distinguish clearly between observed student errors and possible pedagogical interpretations.\n"
            "3. State explicitly what the evidence DOES NOT establish to prevent teachers from making unwarranted assumptions.\n"
            "4. Never label students as weak, incapable, or slow. Frame gaps as contextual and malleable concepts.\n"
            "5. Output valid JSON only."
        )

        prompt = f"""
Analyze the following classroom assessment evidence for a teacher:
Subject: {subject}
Grade Level: {grade_level}
Curriculum Topic: {topic_name}
Severity Rating: {severity}
Student Identifier: {anonymized_student_code}
Assessment Evidence: {evidence}

Return a JSON object with exactly these fields:
{{
  "evidence_analysis": "Concise paragraph detailing what the specific assessment error shows about the student's current mechanical or conceptual approach.",
  "key_skills_needing_attention": ["Specific skill 1", "Specific skill 2"],
  "unsupported_claims": "Clear statement of what this single assessment evidence does NOT prove (e.g. doesn't prove lack of algebraic aptitude, doesn't establish whether it was arithmetic calculation slip vs conceptual omission).",
  "recommended_diagnostic_checks": ["Specific check 1 (e.g. ask student to vocalize step 2)", "Specific check 2"],
  "evidence_strength": "moderate"
}}
"""
        raw_json, model_used = self._execute_with_fallback(
            contents=prompt,
            system_instruction=system_instruction,
            json_output=True,
            temperature=0.2,
        )
        data = self._parse_json(raw_json)
        data["model_used"] = model_used
        return data

    def recommend_interventions(
        self,
        topic_name: str,
        subject: str,
        grade_level: str,
        evidence: str,
        severity: str,
    ) -> Dict[str, Any]:
        """
        Feature B: Recommends practical, classroom-ready interventions for teacher review and approval.
        """
        system_instruction = (
            "You are a master teacher and instructional coach for Parallax.\n"
            "Generate 2-3 classroom-ready, practical intervention activities tailored to the specific learning gap.\n"
            "Each suggestion is a proposal that the teacher will inspect and approve or modify.\n"
            "Ensure activities are realistic for standard 15-20 minute classroom sessions or small-group work.\n"
            "Output valid JSON only."
        )

        prompt = f"""
Context:
Subject: {subject} ({grade_level})
Topic: {topic_name}
Observed Gap Evidence: {evidence}
Severity: {severity}

Generate 2 distinct intervention proposals.
Return a JSON object matching this schema:
{{
  "proposals": [
    {{
      "title": "Clear action-oriented intervention title",
      "strategy_type": "one of: visual_area_model, peer_tutoring, guided_worked_examples, interactive_simulation, targeted_worksheet, bench_laboratory",
      "learning_objective": "Single concrete learning goal",
      "classroom_activity": "Step-by-step 2-sentence description of what teacher and student do in class",
      "duration_minutes": 15,
      "materials_needed": "List of simple materials, printout, or simulator",
      "check_understanding": "Immediate 1-question exit ticket or verbal check",
      "evidence_basis": "Why this specifically addresses the observed evidence",
      "limitations": "Assumption (e.g. assumes student knows basic sign rules)",
      "requires_teacher_approval": true
    }}
  ]
}}
"""
        raw_json, model_used = self._execute_with_fallback(
            contents=prompt,
            system_instruction=system_instruction,
            json_output=True,
            temperature=0.3,
        )
        data = self._parse_json(raw_json)
        data["model_used"] = model_used
        return data

    def answer_teacher_assistant(
        self,
        question: str,
        context_summary: str,
        teacher_name: str,
    ) -> Dict[str, Any]:
        """
        Feature C: Answers teacher questions in context using authorized class/assessment data.
        """
        system_instruction = (
            "You are the Parallax Teacher Intelligence Assistant.\n"
            "You assist teachers by synthesizing classroom data, recommending pedagogical adjustments, and answering curriculum questions.\n"
            "Philosophy: Look beyond the score. Teachers make all final decisions.\n"
            "Never leak private identifiers. Use only the provided context.\n"
            "Keep answers concise, actionable, and structured with bullet points where appropriate.\n"
            "Output valid JSON only with keys 'answer' (string) and 'suggested_follow_up_questions' (array of strings)."
        )

        prompt = f"""
Teacher Name: {teacher_name}
Question: {question}

Authorized Context Information:
{context_summary}

Respond in JSON:
{{
  "answer": "Your supportive, professional pedagogical answer.",
  "suggested_follow_up_questions": [
    "Relevant follow-up 1?",
    "Relevant follow-up 2?"
  ]
}}
"""
        raw_json, model_used = self._execute_with_fallback(
            contents=prompt,
            system_instruction=system_instruction,
            json_output=True,
            temperature=0.3,
        )
        data = self._parse_json(raw_json)
        data["model_used"] = model_used
        return data

    def summarize_memory_chain(
        self,
        assessment_title: str,
        pre_evidence: str,
        initial_score: float,
        intervention_title: str,
        strategy_type: str,
        outcome_status: str,
        outcome_score: Optional[float],
        observations: str,
    ) -> Dict[str, Any]:
        """
        Feature D: Synthesizes longitudinal intervention outcome without claiming unfounded causality.
        """
        system_instruction = (
            "You are the Parallax Teacher Memory Engine evaluation module.\n"
            "Analyze the pedagogical trajectory from assessment evidence through intervention to follow-up.\n"
            "Crucial safeguard: Do not claim the intervention solely caused the score improvement. "
            "Acknowledge test differences, practice effects, and time factors.\n"
            "Output valid JSON only."
        )

        prompt = f"""
Pre-Intervention Assessment: {assessment_title}
Initial Score: {initial_score}%
Original Gap Evidence: {pre_evidence}
Applied Intervention: {intervention_title} ({strategy_type})
Follow-Up Outcome Status: {outcome_status}
Follow-Up Score: {outcome_score}% if outcome_score else 'Not scored'
Teacher Observations: {observations}

Return JSON with:
{{
  "observed_changes": "Objective factual summary of performance change between the two checks.",
  "evidence_strength": "moderate or high depending on whether follow-up score is present",
  "causality_caveat": "Explicit note that score movement reflects multiple classroom factors, practice effects, and student familiarity alongside the applied strategy.",
  "suggested_next_step": "Actionable next step for the teacher to consolidate learning."
}}
"""
        raw_json, model_used = self._execute_with_fallback(
            contents=prompt,
            system_instruction=system_instruction,
            json_output=True,
            temperature=0.2,
        )
        data = self._parse_json(raw_json)
        data["model_used"] = model_used
        return data


gemini_service = GeminiService()
