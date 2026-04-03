# Brief: Call Script Editor

## Background

We build AI phone agents. Our clients define call scripts — structured conversation flows that tell the AI agent what to say, what to ask, and how to route the call based on answers.

Today, scripts are configured in a complex JSON format that only our internal team can work with. Clients write their scripts in Word documents or Google Docs, then our team manually translates those into the JSON config. This is slow, expensive, and creates a dependency on us for every change.

We're building a new script editor that lets clients author scripts directly. The core insight: clients already think about scripts as documents — numbered sections, bullet points, indented branches. The editor should feel like writing a document, not filling out a form.

## Design Philosophy

**Notion-style block editor.** Each step in the script is a block. You read the script top to bottom like a conversation. Simple steps are one line. Complex steps expand to reveal additional properties.

**Progressive disclosure.** A greeting step should be as simple as typing a line of text. Advanced features (extraction logic, conditions, outcomes, integrations) appear only when the author needs them. The editor should feel lightweight for simple scripts and capable for complex ones.

**The document is the config.** There's no separate "preview" or "code view." What you see in the editor is the script. The structured data (step types, field types, choices, branches) lives as inline annotations — tags, chips, toggles — woven into the document.

**Target user.** Sales ops, customer success managers, business owners. Not developers. These people are comfortable writing in Google Docs and using tools like Notion. They've never seen JSON and shouldn't have to.

## The Schema

### Top-Level Structure

A script has these sections:

| Section       | What it contains                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Info**      | Script name, company name, agent name                                                                                                                    |
| **Tone**      | A single free-text description of the agent's personality and communication style                                                                        |
| **Context**   | Known variables available at call start — lead data from forms, CRM fields, appointment details. Each variable has a name and optionally a default value |
| **Knowledge** | Q&A pairs the agent can draw from at any point in the call, regardless of which step is active. Think FAQ                                                |
| **Outcomes**  | The possible results of a call (e.g., converted, disqualified, no_longer_interested). These are used for CRM updates and reporting                       |
| **Steps**     | The script itself — an ordered list of steps                                                                                                             |

### Step Types

Every step has:

- **name** — a human-readable label, also used as the field/variable name for collect steps
- **type** — determines what the step does and which additional fields are available
- **say** (optional) — literal line(s) the agent speaks, verbatim or near-verbatim
- **instruction** (optional) — free-text guidance to the AI about how to handle this step
- **only_if** (optional) — a condition on context variables that gates whether this step runs
- **outcome** (optional) — if reaching this step sets or updates the call's result

The five types:

**`say`** — deliver a message, no data collection. Simplest step type — just a name and a line of text.

**`collect`** — ask a question and capture a typed answer. Additional fields:

- **field_type**: `text`, `number`, `yes/no`, or `selection`
- **choices**: the options (only for `selection`)
- **extraction**: free-text instructions for how to pull structured data from the user's answer (only for `text` and `number` — tells the system what to extract from a conversational response)

**`branch`** — route the conversation based on a previously collected answer. Additional fields:

- **field**: which collected field to branch on
- **branches**: named paths (keyed by answer value), each containing its own list of child steps

**`action`** — call an external API mid-call. Additional fields:

- **url**: the API endpoint
- **input**: which collected fields to send
- **output**: which response fields to store as new variables for use in later steps

**`handoff`** — end or transfer the call. Additional fields:

- **method**: `hang_up`, `transfer`, or `schedule`
- **destination**: phone number, scheduling link, etc.
- **hold_messages**: what the agent says while waiting for a transfer to connect

### Branching Model

Branching is always explicit and visual. A `branch` step is a dedicated step type that appears in the flow as a clear fork. Each branch path contains its own nested steps. Branches can nest (a branch inside a branch), but deep nesting should be handled gracefully.

There's a deliberate separation: `branch` handles routing based on collected answers. `only_if` handles gating based on pre-existing context variables (like whether this is an inbound or outbound call). They don't overlap.

## Sample Script: Care-In-Homes

This is a real client script for a senior care referral service. Outbound calls to leads who submitted a form requesting care options. The agent confirms their information, qualifies them, finds matching care agencies via an API, and attempts a live transfer.

```yaml
info:
  name: Care-In-Homes Qualification
  company: Care-In-Homes
  agent_name: Ellie

tone: >
  Warm, empathetic, professional. You're helping families
  find care for loved ones — often in stressful situations.
  Be patient and understanding. Don't rush. If they're
  hesitant, gently reassure without being pushy.

context:
  contact_name: ""
  search_zip: ""
  lander: ""
  call_type: "" # inbound or outbound

outcomes:
  - converted
  - disqualified
  - no_longer_interested

knowledge:
  - q: "Can I use private insurance?"
    a: >
      Most in-home care services are not covered by insurance,
      Medicare, Medicaid or public assistance. Paying out of
      pocket is the norm for companion care services.
  - q: "How much does home care cost?"
    a: >
      That's a great question, it's going to depend on a
      number of factors which is why I recommend speaking with
      several agencies.
  - q: "Do I need to make a decision today?"
    a: >
      Researching your options is the best way to find the
      right care. A final decision won't have to be made today.
  - q: "Are you better than the last agency I worked with?"
    a: >
      I'm so sorry to hear that. We pride ourselves on
      partnering with the best agencies that will help you
      find the perfect caregiver.
  - q: "Do you have offices in my area?"
    a: >
      Dark Horse CPAs is a fully remote firm. We match
      expertise with need, not geography.
  - q: "Can you give me the agency's phone number?"
    a: >
      I don't have their phone number, but I can connect you
      with someone directly and they can provide all their
      contact information.

steps:
  - name: greeting
    type: say
    say: >
      I'm an advisor with Care-In-Homes following up about
      your request for senior care.

  - name: still looking for care
    type: collect
    field_type: yes/no
    say: "Are you still looking for care?"

  - name: route by interest
    type: branch
    field: still_looking_for_care
    branches:
      no:
        - name: not interested
          type: say
          say: >
            Ok, thank you for your time and please feel free
            to call us in the future!
          outcome: no_longer_interested
        - name: end call - not interested
          type: handoff
          method: hang_up

      yes:
        - name: zip code
          type: collect
          only_if: call_type is inbound
          field_type: text
          say: "Can you please share the zip code where you need care?"
          extraction: "A 5-digit US zip code."

        - name: zip code confirmation
          type: collect
          only_if: call_type is outbound
          field_type: yes/no
          say: "Is the zip code where you need care {search_zip}?"

        - name: route zip confirmation
          type: branch
          only_if: call_type is outbound
          field: zip_code_confirmation
          branches:
            no:
              - name: corrected zip code
                type: collect
                field: search_zip
                field_type: text
                say: "Can you please share the correct zip code?"
                extraction: "A 5-digit US zip code."

        - name: care recipient
          type: collect
          field_type: selection
          choices: [Mother, Father, Spouse, Self, Other]
          say: >
            Who is the care for?
            Mother, father, spouse, self or other?

        - name: type of services
          type: collect
          field_type: selection
          choices: [In-home, Assisted living, Both]
          say: >
            Are you looking for in-home care,
            assisted living, or both?

        - name: care service timeline
          type: collect
          field_type: selection
          choices:
            - Immediately
            - Within 30 days
            - Over 30 days
            - Just gathering information
          say: >
            Would you be looking to start services immediately,
            within 30 days, or over 30 days?

        - name: financing method
          type: collect
          field_type: selection
          choices:
            - Private funds
            - Long Term Care Insurance
            - Medicaid/Public Assistance
            - Other
          say: >
            How do you plan on paying for care? Private pay,
            long term care insurance, medicaid, or public
            assistance?

        - name: route by financing
          type: branch
          field: financing_method
          branches:
            "Medicaid/Public Assistance":
              - name: willing to self pay
                type: collect
                field_type: yes/no
                say: >
                  Most in-home care services are not covered by
                  insurance, Medicare, Medicaid or public
                  assistance. Will you be potentially willing
                  to pay yourself using private funds?

              - name: route willing to pay
                type: branch
                field: willing_to_self_pay
                branches:
                  no:
                    - name: cannot help
                      type: say
                      say: >
                        Our partners only accept private pay at
                        this time, you may try calling 211 for
                        additional assistance. Have a nice day.
                      outcome: disqualified
                    - name: end call - cannot help
                      type: handoff
                      method: hang_up
                  yes:
                    - name: acknowledged self pay
                      type: say
                      say: "Great, thank you."

        - name: budget for care
          type: collect
          field_type: number
          say: >
            Last question: what is your estimated
            monthly budget for care?
          extraction: "Monthly budget amount in dollars."

        - name: check for options
          type: action
          say: >
            I'm going to go ahead and check for the best
            matches for you.
          url: "https://api.pipelinesuccess.com/calls/update"
          input:
            - contact_name
            - search_zip
            - care_recipient
            - type_of_services
            - care_service_timeline
            - financing_method
            - budget_for_care
          output:
            transfer_1_name: "targets.0.company"
            transfer_1_phone: "targets.0.phone_number"
            transfer_2_name: "targets.1.company"
            transfer_2_phone: "targets.1.phone_number"
            transfer_3_name: "targets.2.company"
            transfer_3_phone: "targets.2.phone_number"
            match_names: "matches.*.company"
            selected_action: "action"

        - name: route by matches
          type: branch
          field: selected_action
          branches:
            transfer:
              - name: offer transfer 1
                type: collect
                field_type: yes/no
                say: >
                  Great news, I have {transfer_1_name} available,
                  they are wonderful. Let me bring them on the
                  line, is that ok?

              - name: route transfer 1
                type: branch
                field: offer_transfer_1
                branches:
                  yes:
                    - name: transfer to partner 1
                      type: handoff
                      method: transfer
                      destination: "{transfer_1_phone}"
                      say: >
                        It should take less than a minute to
                        bring them on the line.
                      hold_messages:
                        - "They're great, I know they're helping a lot of families!"
                        - "Sorry about the delay, I'm working to bring them on the line."
                        - "Shouldn't take much longer, thanks for being patient."
                      outcome: converted
                  no:
                    - name: offer transfer 2
                      type: collect
                      field_type: yes/no
                      say: >
                        The second option I have for you is
                        {transfer_2_name}. Can I transfer you
                        to their specialist?

                    - name: route transfer 2
                      type: branch
                      field: offer_transfer_2
                      branches:
                        yes:
                          - name: transfer to partner 2
                            type: handoff
                            method: transfer
                            destination: "{transfer_2_phone}"
                            say: >
                              It should take less than a minute.
                            hold_messages:
                              - "They're great, helping a lot of families!"
                              - "Sorry about the delay."
                            outcome: converted
                        no:
                          - name: offer transfer 3
                            type: collect
                            field_type: yes/no
                            say: >
                              What about {transfer_3_name},
                              can I connect you with them?

                          - name: route transfer 3
                            type: branch
                            field: offer_transfer_3
                            branches:
                              yes:
                                - name: transfer to partner 3
                                  type: handoff
                                  method: transfer
                                  destination: "{transfer_3_phone}"
                                  say: >
                                    It should take less than
                                    a minute.
                                  hold_messages:
                                    - "Thanks for your patience!"
                                  outcome: converted
                              no:
                                - name: no transfer accepted
                                  type: say
                                  say: >
                                    No problem. We'll have one
                                    of our partners give you a
                                    call back.
                                  outcome: converted

            no_matches:
              - name: no matches available
                type: say
                say: >
                  I'm sorry, but we couldn't find a good match
                  right now. We will be in touch if something
                  becomes available.
              - name: end call - no matches
                type: handoff
                method: hang_up
```

## Additional Context for Reference

Here are two other client scripts that represent different use cases. These are included so the editor design accounts for a range of script complexity — from heavily branched qualification flows to more linear confirmation calls.

### Dark Horse CPAs — Appointment Confirmation + Qualification

A CPA firm that confirms upcoming appointments and collects tax/accounting details. Mostly linear with section skips based on service type. Heavy on FAQ handling and hard copy. Seven inbound channels (Book a Consult, Pricing Tool, Tax Assessment, etc.).

**Notable patterns:**

- Long sections of verbatim copy — the script author writes exactly what the agent should say
- Service-type branching: tax clients get tax questions (sections 4.1–4.6), accounting clients get accounting questions (section 5), clients requesting both get both sections sequentially
- Rich FAQ section with specific pricing information, office location questions, document handling
- Soft data collection — many questions are optional, with graceful fallbacks ("Not a problem, your CPA can discuss this during the meeting")
- The call is a pre-meeting prep call, not a sales call — tone is helpful and low-pressure

### Monday.com — Sales Qualification

A SaaS company qualifying inbound leads for their product consultants. Complex branching with numeric thresholds and a multi-stage flow (Qualification → Enrichment → Soft Letdown).

**Notable patterns:**

- Persona detection mid-call: "Explorer" (vague/browsing) vs "Sprinter" (specific/urgent) — different questions for each
- Numeric qualification gate: user count must exceed a threshold, with expansion probing if below
- Multi-stage flow with distinct sections (qualification, enrichment, soft letdown) that have their own entry conditions
- Mix of verbatim copy and generative/instructional steps
- Computed logic: adding current users + planned expansion users, date arithmetic for timeline validation
- Competitor handling: specific one-liners for named competitors (Asana, Trello, ClickUp)

### Vehicle Protection Plan — Renewal Sales

An outbound call to renew a vehicle protection plan. Mostly linear with a rapport-building stage. The script is structured as a staged sales conversation.

**Notable patterns:**

- Dynamic rapport stage: "Compliment the {Vehicle}. Be conversational. Ask about their experience."
- Heavy use of injected variables: {Vehicle}, {Dealership}, {Expiry Date}, {Average Repair Cost}
- Linear flow with almost no branching — just a yes/no fork at closing
- The pitch section references earlier answers: "the {Level of Cover} plan will be perfect because {Specific Needs mentioned earlier}"
- Warm transfer at end with idle chatter while waiting: "Chat cheerfully about their car or plans for the weekend"
