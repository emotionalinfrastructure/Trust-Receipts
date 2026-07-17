# Reference Conformance Evidence

Profile: `trust-receipt-conformance-decision-profile` `0.1-rev1`

Result: **9 of 9 vectors matched**; 0 failed.

| Case | Purpose | Match | Decision | Execution mode |
|---|---|---:|---|---|
| T01 | All requirements pass at C0 | PASS | conforms | approved_boundary |
| T02 | Noncritical partial at C1 | PASS | conditionally_conforms | restricted_agentic_with_time_bounded_remediation |
| T03 | Any failure is nonconforming | PASS | does_not_conform | disabled_or_manual_control |
| T04 | Any partial at C3 requires manual control | PASS | conditionally_conforms | manual_control |
| T05 | Critical partial at C2 requires manual control | PASS | conditionally_conforms | manual_control |
| T06 | Noncritical partial at C2 permits restricted operation | PASS | conditionally_conforms | restricted_agentic_with_time_bounded_remediation |
| T07 | Unavailable verification evidence overrides a pass claim | PASS | does_not_conform | disabled_or_manual_control |
| T08 | All requirements pass at C3 | PASS | conforms | approved_boundary |
| T09 | Failure at C3 disables agentic operation | PASS | does_not_conform | disabled_or_manual_control |

This report demonstrates the included reference logic against the included vectors. It is not third-party certification or external audit evidence.
