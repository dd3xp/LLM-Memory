
Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory
(b) GPQA-Diamond (Rein et al., 2024): A high-quality,
difficult subset of the Graduate-Level Google-Proof Q&A
(GPQA) benchmark, GPQA-Diamond contains 198 expert-
validated questions across natural sciences, including bi-
ology, chemistry, and physics. These questions were cor-
rectly answered by domain experts but often missed by
non-experts, making them ideal for evaluating DC’s ability
to handle complex, multi-hop reasoning tasks.
(c) Game of 24 (Yao et al., 2023; Suzgun & Kalai, 2024): A
heuristic-driven arithmetic challenge where the objective is
to form an expression that evaluates to 24 using four given
numbers exactly once. For instance, if the input values
were “7 7 8 11,” one valid answer would be “8*(7+7-11).”
This task emphasizes systematic search, strategic reasoning,
and pattern recognition. We use the 100 examples from
(Suzgun & Kalai, 2024) to assess DC’s capacity for refining
computational heuristics and strategy over manual attempts.
(d) Math Equation Balancer: Focused on elementary arith-
metic reasoning, this dataset requires the model to complete
equations by inserting the appropriate operators to form
valid expressions. The task emphasizes the sequential place-
ment of operators, as illustrated by the example “1 ? 2 ? 3 =
6,” where the model must identify the correct operators to
satisfy the equation (“1 + 2 + 3 = 6” or “1 * 2 * 3 = 6”). We
compiled 250 arithmetic expressions for this task.
(e) MMLU-Pro (Engineering and Physics) (Wang et al.,
2024b): A professional-level subset of the MMLU bench-
mark focused on physics and engineering. All questions are
presented in a multiple-choice form. The original dataset
contains 1,299 physics and 969 engineering questions. We
sampled 250 questions from each subset.
3.2. Language Models
We evaluate the efficacy of DC across a range of language
models. Our selection includes both state-of-the-art LLMs
such as GPT-4o and Claude 3.5 Sonnet and their smaller-
scale counterparts (namely, GPT-4o-mini and Claude 3.5
Haiku), as well as models such as DeepSeek R1 that are
designed specifically for reasoning-intensive tasks.
3.3. Evaluation Protocol
To ensure standardized and reliable evaluation, all models
are instructed to format their final answers in a structured,
machine-readable format. All model answers are expected
to be wrapped in the following XML-style tags:
<answer>
(final answer)
</answer>
This explicit format ensures accurate and consistent parsing,
eliminating errors arising from extraneous text or ambiguous
outputs. Once extracted, the final answers are evaluated
using their corresponding task-specific accuracy metric.
3.3.1. Accuracy Metrics
Given the diversity of the tasks, we use different accuracy
metrics tailored to the specific requirements of each dataset.
Soft Match (SM) is a lenient metric that considers an an-
swer correct if it matches the ground truth after ignoring
minor formatting differences, such as punctuation or whites-
pace variations. We apply this metric to GPQA-Diamond,
and MMLU Pro (Engineering and Physics), in which ques-
tions are presented in a multiple-choice format.
Functionally Correct (FC) is an even more flexible metric
that evaluates whether the model’s output satisfies the task-
specific constraints, even if the exact numeral presentation
or formatting differs slightly from the reference solution.
We apply this metric to the Game of 24, Math Equation
Balancer, and AIME benchmarks.
4. Main Results
4.1. DC enables test-time learning and reduces
repetitive errors
One of the most compelling illustrations of DC’s capabili-
ties emerges from the Game of 24 task. As seen in Table 1,
GPT-4o’s baseline accuracy on this arithmetic puzzle was
just 10%. Under DC-RS, its performance increased to 99%,
illustrating DC’s capacity for test-time learning and iterative
refinement. Early in the task sequence, GPT-4o discovered
a reliable, Python-based brute-force method to solve Game
of 24 and later on recognized the repetitive structure of the
problem. The model then encoded this approach into its
memory. Once established, GPT-4o consistently retrieved
and applied the more or less same Python solution for sub-
sequent examples, leading to rapid and accurate results.
The performance under DC-∅ (19%) further highlights the
positive impact of memory curation and retrieval. DC-∅ uses
the same core generator but keeps the memory empty, thus
lacking the mechanism to store and reuse solutions. The
large gap between 19% (DC-∅) and 99% (DC-RS) confirms
that effective memory usage, in which past solutions are
retrieved and generalized, is the main driver of GPT-4o’s
transformation from ad-hoc solver to near-perfect performer
in Game of 24.
In contrast, Claude 3.5 Sonnet showed marginal gain, mov-
ing from 12% to 14%. Despite DC’s scaffolding, Claude did
not internalize a generalized approach but instead continued
to rely on manual arithmetic solutions. This underscores
that while DC provides the framework for test-time adap-
tation, its ultimate success hinges on the model’s innate
capacity to identify and encode robust, reusable strategies.
5
Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory
Tasks Claude 3.5 Sonnet GPT-4o
BL DC-∅ DR DC-Cu. DC-RS BL DC-∅ DR DC-Cu. DC-RS
AIME 2024 23.3 36.7 43.3 50.0 46.7 20.0 36.7 26.7 36.7 40.0
AIME 2025 6.7 23.3 23.3 36.7 30.0 6.7 10.0 10.0 16.7 20.0
AIME 2020–24 6.7 30.1 39.1 38.4 40.6 9.8 24.1 24.1 20.3 24.8
Game of 24 12.0 10.0 11.0 14.0 14.0 10.0 19.0 6.0 93.0 99.0
GPQA Diamond 59.6 60.1 63.6 61.1 68.7 57.1 57.1 55.1 58.1 57.1
Math Eqn. Balancer 44.8 56.4 60.4 100 97.8 50.0 88.0 100 100 99.2
MMLU Pro Eng. 61.2 57.2 65.2 66.8 67.6 53.2 51.6 48.8 44.0 51.2
MMLU Pro Physics 74.0 75.6 80.4 77.6 82.0 75.6 70.8 75.6 70.4 75.2
Table 1: Performance comparison of Dynamic Cheatsheet (DC) variants for Claude 3.5 Sonnet and GPT-4o across multiple benchmarks.
BL (Baseline): standard inference without memory; DC-∅ (Empty Memory): includes structured problem-solving and explicit tool-use
instructions but no memory retention mechanism; DR (Dynamic Retrieval): uses retrieval but lacks curated memory updates; DC-Cu
(Cumulative Memory): iteratively accumulates model solutions but lacks retrieval; and DC-RS (Retrieval & Synthesis): combines
retrieval with memory refinement/synthesis. These results highlight substantial accuracy gains under DC: Claude 3.5 Sonnet’s AIME
2024 accuracy jumps by 27% under DC-Cu, and GPT-4o’s Game of 24 accuracy leaps from 10% to 99% under DC-RS.
4.2. DC provides substantial improvements across
various challenging reasoning benchmarks
Beyond Game of 24, DC yielded significant gains across a
range of complex mathematical and algorithmic tasks. See
Table 1. The results below illustrate how iterative solution
reuse can helpful in complex reasoning problems.
AIME Exam Problems. The AIME exams provided some
of the most dramatic improvements under DC. For Claude
3.5 Sonnet, performance on AIME 2020–2024 surged from
6.7% to 40.6% under DC-RS. A similar upward trend ap-
peared on AIME 2024 (23.3% to 50.0%) and AIME 2025
(6.7% to 36.7%) under DC-Cu. DC-Cu, where the model
curates memory after processing the input and does not in-
volve a retrieval stage, also proved potent in recent exam
sets, achieving highest accuracy scores in AIME 2024 and
2025. GPT-4o also showed some noteworthy gains. Its
AIME 2024 performance raised from 20.0% to 40.0% un-
der DC-RS, while its AIME 2025 score climbed from 6.7%
to 20.0%. These boosts suggests that structured test-time-
produced memory can help tackle difficult math problems.
GPQA-Diamond. On GPQA-Diamond, Claude 3.5 Son-
net improved from 59.6% to 68.7% under DC-RS, a robust
9.1% gain purely from test-time adaptation. DR (63.6%)
demonstrated that retrieval alone helps, but the further jump
to 68.7% highlights how memory curation and synthesis can
yield additional benefits. By contrast, GPT-4o experienced
only a slight increase from 57.1% to 58.1% with DC-RS;
our quantitative analysis of the model’s outputs and mem-
ory showed us that retrieval can, in some cases, introduce
confusion, especially if suboptimal examples are recalled.
This contrast between different models underscores how
the success of retrieval-based adaptation partly depends on
model-specific generation and curation capabilities.
Math Equation Balancer. As Table 1 shows, the base-
line performance for Claude 3.5 Sonnet (44.8%) rose to
98–100% with DC-RS and DC-Cu, while GPT-4o similarly
improved from 50.0% to near-perfect accuracy (99–100%).
As observed in Game of 24, the models quickly learned an
algorithmic or Python-based balancing routine, stored it in
external memory, and repeatedly retrieved it, achieving ex-
ceptional consistency once the core method was established.
MMLU-Pro Tasks. For MMLU-Pro Eng. and Physics,
Claude 3.5 Sonnet exhibited consistent gains, rising by up
to 8.0% in Physics (from 74% to 82%). Our examination of
the curated memory entries shows that Claude temporarily
stored and retrieved compact “reference guides” on engi-
neering and physics principles, which might have proved
beneficial for thematically similar questions. GPT-4o, on
the other hand, observed slight decreases from the baseline
on these tasks, suggesting that domain complexity and base-
line knowledge gaps may attenuate DC’s benefits if curated
memory is less reliable or consistent.
4.3. Memory curation (DC) fosters generalization and
provides gains over full-history-appending (FH)
Whereas FH (full-history) simply appends every previous
dialogue turn into the prompt, DC actively filters and syn-
thesizes high-value content. As shown in Table 2, Sonnet
under FH reached 26.7% accuracy in 2024 questions, while
DC-based methods hit 50.0%. Similarly, GPT-4o managed
a baseline of 20.0% but fell to 6.7% using FH, in direct
contrast to 40.0% with DC-RS. Excessive uncurated input-
output pairs can not only overwhelm the model’s context
window, dilute crucial insights and hamper retrieval effi-
ciency, but also significantly increase inference costs over
time. On the other hand, DC’s selective memory curation en-
sures that problem-solving tips or code snippets remain read-
ily accessible without clutter, thus facilitating more robust
and consistent improvements across consecutive queries.
6
Dynamic Cheatsheet: Test-Time Learning with Adaptive MemoryReusable Code Snippets and Solution Strategies
<memory_item>
</memory_item>
Count: 99
<example>
Steps:
1. Understand the Problem:
- Input: Four integers.
- Goal: Combine the numbers using arithmetic operations and parentheses to evaluate to 24.
- Constraints: Each number must be used exactly once.
2. Approach:
- Use brute force or systematic trial-and-error to test all possible combinations of numbers, operations, and
parentheses.
- Prioritize operations that simplify the problem (e.g., division resulting in integers, subtraction reducing values).
- Check edge cases (e.g., repeated numbers, large/small values).
3. Example Solution:
- Input: 6, 8, 8, 12
- Solution: (6 * ((8 + 8) - 12) = 24)
4. Tips:
- Use parentheses to control operation precedence.
- Division should result in valid integers or fractions.
- Test all permutations of the numbers and operations systematically.
Python Code for Automation
</example>
<description>
Game 24 Solver Strategy: Solve the 24 Game by systematically testing combinations of four numbers with
arithmetic operations (+, -, *, /) and parentheses to achieve a result of 24. Each number must be used exactly once.
</description>
Figure 5: Excerpt from GPT-4o’s external memory after process-
ing 100 examples from Game of 24 under DC-RS. Early in the
test sequence, the model discovered a Python-based brute-force
solution, stored it, and subsequently retrieved it for subsequent
puzzles. This shift to structured code reuse resulted in a dramatic
performance increase from 10% to 99% accuracy, eliminating
arithmetic errors and redundant problem-solving efforts.
4.4. DC fosters efficient tool usage / code generation
A successful behavior under DC is the LLMs’ inclination
toward code generation to handle computationally intensive
tasks. GPT-4o’s near-complete reliance on Python scripts
for Game of 24 exemplifies this shift. Rather than perform-
ing manual arithmetic repeatedly, GPT-4o recognized that
code-based brute force is more systematic. It generated,
stored, and iteratively refined a Python function that tested
permutations of numbers and operations, allowing it to solve
each instance of Game of 24 with high accuracy.
This inclination toward automation illustrates DC’s poten-
tial to nurture efficient tool-usage: the capacity to recognize
when external tools (e.g., Python, symbolic math engines,
or dedicated solvers) are more robust than internally verbal-
ized chain-of-thought calculations. While we restricted the
scope of tool usage to Python interpreter in this study, future
expansions could easily explore a broader suite of tools,
potentially amplifying LLM performance in specialized do-
mains such as computational biology or legal research.
Tasks Claude 3.5 Sonnet GPT-4o
BL FH DC-Cu. BL FH DC-RS
AIME 2024 23.3 26.7 50.0 20.0 13.3 40.0
AIME 2025 6.7 6.7 36.7 6.7 3.3 20.0
Table 2: Performance breakdown of BL (default baseline), FH
(full history), DC-Cu, and DC-RS approaches under AIME 2024
and 2025. FH stores all past queries and outputs, while DC-Cu
and DC-RS selectively refine stored memory. Results indicate
that targeted memory curation in DC-RS leads to greater accuracy
gains compared to full history retention, supporting the need for
structured, self-updating knowledge mechanisms.
4.5. Model scale and capacity impact DC effectiveness
Our current results indicate that the effectiveness of DC is
strongly tied to the model’s scale and underlying generative
capacity. While Claude 3.5 Sonnet and GPT-4o showed
notable gains across multiple tasks under DC, their smaller
counterparts, Claude 3.5 Haiku and GPT-4o-mini, showed
more limited and inconsistent gains.
Table 3, for instance, shows that Claude 3.5 Haiku achieved
moderate gains under DC, with its accuracy on AIME 2024
rising from 10.0% (baseline) to 36.7% under DC-Cu. But
gains on AIME 2025 were weaker, reaching only 13.3%
under DC-∅ and DC-Cu. Interestingly, GPQA-Diamond
saw an improvement from 43.4% to 49.0% under DC-RS,GENERAL META-REASONING STRATEGIES
<memory_item>
</memory_item>
Count: 20
——————————————————————————————
<memory_item>
<example>
Example application:
1. Requirements: list all given conditions
2. Observations: identify applicable theorems
3. Patterns: look for structural relationships
4. Sub-problems: break into steps
5. Verification: test against examples
6. Implementation: use Python for verification
</example>
<description>
Systematic Problem Analysis Framework (Reference: Q1-Q20)
For complex mathematical problems:
1. State problem requirements clearly
2. List key observations and theorems applicable
3. Identify patterns and relationships
4. Break into manageable sub-problems
5. Verify against examples
6. Consider computational approach when analytical solution is complex
7. For grid problems, analyze movement patterns and symmetries
8. For combinatorial problems, use appropriate counting techniques
9. Implement verification code when possible
10. Consider edge cases and constraints
11. For grid coloring problems, consider row/column patterns
</description>
<description>
Solution Verification Strategy (Reference: Q5-Q20)
When verifying mathematical solutions:
1. Use both analytical and computational approaches
2. Implement multiple verification methods
3. Check edge cases and boundary conditions
4. For grid problems, verify movement patterns
5. For combinatorial problems, verify counting logic
6. Test solution against given examples
7. Implement computational verification when possible
Figure 6: Example of Claude 3.5 Sonnet’s curated memory after
processing 20 AIME 2024 questions under DC-Cu. The memory
captures key solution strategies, enables the model to generalize
across similar computational problems, and boosts its accuracy.
7
Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory
Figure 7: Cumulative performance progression under DC for GPQA-Diamond (left) and Game of 24 (right). In GPQA-Diamond, Claude
3.5 Sonnet steadily improves as it accumulates relevant knowledge snippets (the first few points are noisy because y measures cumulative
accuracy). Meanwhile, in Game of 24, GPT-4o rapidly transitions from trial-and-error arithmetic to near-perfect performance once it
recognizes and stores a Python-based solution. These trends highlight DC’s ability to enhance accuracy via iterative test-time learning.
suggesting that retrieval-based adaptation might still provide
utility in smaller models.
Tasks Claude 3.5 Haiku
BL DC-∅ DC-Cu. DC-RS
AIME 2024 10.0 26.7 36.7 30.0
AIME 2025 0.0 13.3 13.3 10.0
GPQA-Diamond 43.4 41.9 43.7 49.0
Tasks GPT-4o-mini
BL DC-∅ DC-Cu. DC-RS
AIME 2024 16.7 20.0 13.3 13.3
AIME 2025 10.0 13.3 13.3 16.7
GPQA-Diamond 34.3 34.3 33.8 32.3
Table 3: Performance of Claude 3.5 Haiku and GPT-4o-mini, the
smaller counterparts of Claude 3.5 Sonnet and GPT-4o, across
AIME (2024, 2025) and GPQA-Diamond. These smaller models
struggle to fully leverage DC, suggesting that memory-based adap-
tation is most effective when the base LM has sufficient generative
competence. Performance improvements are more muted, high-
lighting the dependency of DC on model-scale reasoning ability.
That said, GPT-4o-mini (Table 3) showed even smaller gains,
with some variants leading to slight declines in performance.
On AIME 2024, DC-∅ provided a 20.0% boost, but both
DC-Cu and DC-RS performed worse than baseline. AIME
2025 showed a minor improvement, peaking at 16.7% under
DC-RS. On GPQA-Diamond, GPT-4o-mini’s performance,
however, remained largely stagnant or slightly declined un-
der memory-based adaptation, suggesting that it struggled
to leverage stored information effectively.
These imply two drawbacks of smaller models under DC:
(a) Generative competence. For DC to be effective, the base
model must produce correct solutions with sufficient fre-
quency to populate the memory with high-quality, reusable
strategies. Smaller models, such as GPT-4o-mini and
Claude 3.5 Haiku, generate correct solutions less reliably,
leading to a sparse or low-quality memory repository. As a
result, iterative refinement stalls because the stored knowl-
edge consists mostly of incorrect or partial attempts.
(b) Contextual and memory curation limitations. Smaller
models struggle with long-context understanding/genera-
tion and memory retrieval, leading to inefficient or irrele-
vant memory usage. Unlike their larger counterparts, which
can more effectively retrieve and synthesize solutions from
stored heuristics, smaller models often fail to retrieve the
most relevant past solutions or misapply retrieved knowl-
edge to new problems. This results in inconsistent perfor-
mance under DC-RS, particularly in tasks requiring complex
reasoning or strategic adaptation.
4.6. Test-time task similarity and example ordering can
amplify DC’s overall impact
Another central insight is that DC thrives when test ex-
amples share structural similarities. In both Game of 24
and Math Equation Balancer, once GPT-4o identified an
efficient solution, it reused it consistently for subsequent
tasks. Similarly, in AIME, discovering a geometry or com-
binatorics strategy allowed for easy transfer across ques-
tions of analogous structure. Consequently, tasks arranged
to present related questions early may accelerate and im-
prove the model’s test-time learning. This suggests that
curriculum-style learning (Bengio et al., 2009), where sim-
pler or archetypal problems are presented first to build a
repository of valid heuristics, may potentially bootstrap per-
formance. Cf. (Lopez-Paz & Ranzato, 2017; Zelikman et al.,
2022; Chen et al., 2024)
5. Additional Analyses and Discussions
Reasoning and information efficiency. One key insight is
that DC reduces the need to “reinvent the wheel” for each
query. By encoding and reusing well-established techniques
8
Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory
(e.g., Python-based solving for Game of 24), models can
bypass repeated rediscovery of the same strategies. This
significantly cuts down reasoning overhead and token usage
in subsequent queries, though the initial cost of discovering
a robust approach and curating it remains non-trivial.
DC performs better than majority voting (MV). To test
if DC provides advantages over conventional MV at in-
ference, we also tested Sonnet on AIME 2024 and 2025
using both approaches. MV, which selects the most com-
mon answer from three independent generations, yielded
no improvements over single-shot inference. As seen in
Table 4, on AIME 2024, MV performed identically to the
baseline (23.3%), while on AIME 2025, it remained at 6.7%,
offering no tangible gain. Even with DC-∅, MV slightly un-
derperformed (33.3% vs. 36.7%). In contrast, DC-Cu out-
performed MV, reaching 50.0% on AIME 2024 and 36.7%
on AIME 2025. Unlike MV, which passively aggregates out-
puts, DC actively refines knowledge over time, eliminating
errors and improving solution quality. This confirms that
memory-based adaptation is far more effective than simple
statistical voting in complex reasoning tasks.
Tasks Claude 3.5 Sonnet
BL MV(BL) DC-∅ MV(DC-∅) DC-Cu.
AIME 2024 23.3 23.33 36.7 33.3 50.0
AIME 2025 6.7 6.7 23.3 23.3 36.7
Table 4: Comparison of majority voting (MV) with DC on AIME.
Clustering of errors and corrections. Our experiments
suggest that errors and their corrections often cluster in a
latent embedding space. See Figure 10. Once a model
acquires a high-quality heuristic for a cluster of related
queries, it can apply this knowledge to tightly embedded
neighbors. However, faulty heuristics that slip into memory
can be equally amplified. Ensuring that the memory remains
“clean” thus requires careful curation and, if necessary, prun-
ing to avoid propagating erroneous strategies.
Transferability of memory content across models. We
also observed that larger models, such as Claude 3.5 Sonnet
and GPT-4o, can sometimes produce higher-quality strate-
gies that, in principle, could benefit smaller models if the
memory is transferred. However, if a smaller model lacks
the generative capacity to interpret or refine those strategies
correctly, its performance can stall or degrade. In our abla-
tion experiments, we observed mixed results. This indicates
that memory entries, while helpful, cannot fully compensate
for inadequate base capability.
Long-context generation versus understanding. Most
large LLMs excel at processing lengthy inputs but struggle
to generate comparably long12 and well-organized outputs.
12See, e.g., (Liu et al., 2024b).
DC’s memory curation after each query can demand pre-
cise reproduction or modification of prior knowledge. We
observed instances where the model merely references or
abbreviates the existing memory (e.g., “Previous content
[...] preserved”) instead of explicitly rewriting it. Such
truncated memory updates can reduce the quality of stored
heuristics over time. Potential solutions include maintaining
a structured, external database that the LM can reference
without regenerating large swaths of text each time.
Retrieval bottlenecks and noise. While retrieval-based
variants (e.g., DC-RS) can substantially improve accu-
racy, poorly filtered retrieval mechanisms can introduce
confusion, particularly when presented with highly di-
verse or loosely related queries. For example, in our ex-
periments, GPT-4o’s performance occasionally dipped in
GPQA-Diamond due to suboptimal retrieval choices. This
underscores the importance of robust retrieval methods (e.g.,
dense vector search, advanced ranking algorithms) that can
reliably surface higher quality exemplars or heuristics while
suppressing irrelevant or contradictory texts.
Hierarchical and modular memory. As LLM deploy-
ments scale, specialized domains may benefit from subdi-
viding or hierarchically organizing memory. For instance, a
system could maintain separate curated memories for topics
like combinatorics or physics, each updated by a specialized
retrieval or curation mechanism. This may reduce the load
on a unified memory store and help isolate errors within
their respective domains, with the goal of further improving
the clarity and reliability of retrieved heuristics.
Time and token complexity. Although DC requires mem-
ory curation after each query, it optimizes efficiency over
time by reducing redundant computation and token usage.13
As the model retrieves and refines solutions, memory main-
tenance becomes a net gain rather than a cost. However,
its sequential structure still poses challenges for large-scale
parallel or batch tasks requiring independent inference.
Smaller or more specialized models and R1 experiments.
Finally, we note that smaller models, such as GPT-4o-mini,
show limited gains under DC, as seen in Table 3. Additional
experiments with “R1” models such as DeepSeek R1 and
o1 similarly showed minimal or inconsistent improvements.
In these cases, these models’ generative ability appears too
restricted to produce reliable strategies for storage or to in-
terpret retrieved heuristics effectively. The solutions were
far too verbose and long. Without sufficiently accurate and
efficient base solutions, memory curation cannot yield sub-
stantial gains. This limitation ties back to the core premise
that effective DC demands a capable foundation model to
seed and refine the curated knowledge.
13On AIME 2024, Claude Sonnet averaged 370 tokens under
BL, 494 under DC-∅, 1035 under DC-RS, and 1831 under DC-Cu.
9
Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory
Overall, DC offers a useful and practical framework for
continuous, test-time learning in LLMs. Our findings em-
phasize the synergy between model capacity and memory
curation, the importance of structural task similarity and
retrieval precision, and the benefits of offloading repeated
computations to flexible external stores (e.g., Python scripts).
At the same time, alternative mechanisms (e.g., specialized
sub-memories or adaptive example ordering) and more so-
phisticated retrieval techniques (e.g., topological clustering)
remain promising directions for further research.
Acknowledgments
We thank Batu El, Sabri Eyuboglu, Tayfun Gur, Emily Shen,
Jake Silberg, Elana Simon, and Kyle Swanson for their help-
ful comments and suggestions. We also thank the members
of the James Zou Lab at Stanford for their feedback in the
early stages of this project. Suzgun gratefully acknowledges
the support of an HAI-SAP Fellowship