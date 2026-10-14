# User Preferences
- Prefers the assistant to resume work directly after context compaction without acknowledging the summary, recapping prior work, or prefacing with phrases like "I'll continue." Pick up where left off as if the break never happened. Confidence: 0.8
- Prefers autonomous continuation without asking for further questions, clarification, or permission to proceed. Resume and execute the next logical step directly. Fresh confirmation in a new session ("proceed" as the sole instruction to kick off a full implementation) reinforces this. Confidence: 0.85
- Wants production-ready solutions rather than quick fixes, temporary patches, or throwaway code. Expects robust, well-architected implementations that meet a production quality bar. Confidence: 0.75
- Wants root-cause analysis before fixing bugs: trace/read the relevant code paths first, then fix the underlying semantic bugs rather than patching symptoms on the surface. Confidence: 0.8
- Wants every change batch verified against the full quality pipeline (lint, typecheck, tests, build) before reporting done — and wants built artifacts spot-checked to confirm the change actually landed (e.g. grep the dist bundle). Confidence: 0.85
- Prefers multi-part work tracked with a todo list, created up front and kept updated as items complete. Confidence: 0.8
