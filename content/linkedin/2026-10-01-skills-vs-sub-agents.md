---
sujet: "Skills vs Sub-agents"
date: 2026-10-01
platform: linkedin
type: explain-concept
visuel: schema
image: images/2026-10-01-skills-vs-sub-agents.png
image_alt: "Schéma en deux colonnes : skill, même conversation et playbook ; worker, contexte isolé et résultat renvoyé"
---

People keep using "skill" and "sub-agent" as if they were two names for the same upgrade. They are not. One is a playbook for the agent you already have. The other is a second agent you hire for a bounded job.

In coding agents, both show up as soon as a task outgrows a single prompt. Skills live as files in the repo. Sub-agents appear as extra runs you spawn. Mix them up and you get a rigid checklist in the wrong place, or a worker whose summary dropped the file that mattered.

A skill is a procedure the current agent reads and follows. Same conversation. Same context. Same files. It tells this agent how to do a recurring job: publish a post, run the tests, review a PR. It does not create a new mind. It attaches an SOP to the one already talking to you.

A sub-agent is a new agent instance. Isolated context. Own tool loop. It does one job, then returns a result to the parent. Use it when the work would drown the main thread, or when a specialist should not inherit the whole chat.

Question        | Skill               | Sub-agent
----------------|---------------------|------------------
Where it runs   | Same conversation   | Separate context
What it adds    | Playbook / SOP      | Extra worker
Typical cost    | Extra instructions  | New model run
Best for        | Repeatable process  | Explore or isolate
If misused      | Rigid rails         | Lost detail

YAML
name: publish-linkedin
when: user approves a draft
do: validate, save, open PR

delegate:
  task: map auth routes in src
  return: files and risks only

Imagine a release checklist: bump the version, run tests, write the changelog in the house tone. That is a skill. The main agent should stay in the conversation, follow the steps, and keep the file state you just approved.

Now imagine "find every call to the old billing API." That search can dump dozens of files into context. A sub-agent can explore, filter, and come back with a short list. The parent keeps working on the fix instead of drowning in search noise.

The common trap: treating a skill as if it created a specialist. It did not. The same agent just read a longer instruction. Isolation, parallelism, or a clean context cannot be faked by a playbook. The opposite trap is spawning three workers for a checklist that one agent with a skill would do more reliably.

Skills go stale. They encode yesterday's limits. Sub-agents fail differently. They summarize, and the summary can drop the one path that mattered. Choose the failure mode you can live with.

Takeaway: a skill teaches this agent the playbook. A sub-agent hires another agent for a bounded job. If it belongs here, write a skill. If it would flood context, spawn a worker.

When did you last spawn a sub-agent for something a skill would have handled in place?

#AgentSkills #SubAgents #AIAgents #Cursor #SystemDesign
