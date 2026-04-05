// will be a concrete enum, exact values TBD
type CallOutcome = string;
// a query in our proprietary DSL, we'll not be adding custom UI for now (only simple text inputs)
type ConditionDSL = string;
// a single field collected by the agent
type Field = {
  name: string; // field name
  type: "string" | "number" | "boolean"; // field data type
  enum: string[]; // for string fields, enumeration of allowed values
  description?: string; // free text describing the field's value
};
// a branch from a step to a sequence of child steps
type Branch = (
  | { description: string; condition?: never } // free text description, LLM will read it and decide when to pick this branch
  | { condition: ConditionDSL; description?: never } // DSL query, the system will pick this branch based on hard logic
) & {
  say?: string;
  steps: Step[]; // child steps sequence to perform when branch is selected
};
type Step = {
  name: string; // step unique identifier that's also human readable
  condition?: ConditionDSL; // only perform the step when this evaluates to true
  say?: string; // a message for the agent to say verbatim. if "instruction" is not present, agent will repeat this (in varying phrasings) until the step is done
  instruction?: string; // free text instructions for the agent. if "say" is present, this is only used in the following turn.
  fields?: Field[]; // fields to collect in this step. the step is done when all of these are collected.
  optional?: boolean; // whether the user can decline to provide data for "fields"
  webhook?: {
    // perform this when step is done
    url: string;
    input: any;
    output: any;
  };
  outcome?: CallOutcome; // set the call outcome when this step is done
  branches?: Record<string, Branch>; // when the step is done, it will pick up to one of these branches. the picked branch's steps will be executed in order. when the sequence is over, the step after this one gets active.
  experimental?: Record<string, any>; // used for experimental features
};

// # Call ending
// handoff: hang_up | transfer | schedule
// destination: string
// hold_messages: [strings]
