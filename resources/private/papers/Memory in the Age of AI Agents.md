
summarized in Table 9. Most of these frameworks support factual memory via vector or structured stores,
and an increasing subset also models experiential traces, such as dialogue histories, user actions, and episodic
summaries, with multimodal memory emerging more recently. Open-source memory frameworks for LLM
agents span a spectrum from agent-centric systems with rich, hierarchical memory abstractions to more general-
purpose retrieval or memory-as-a-service backends, e.g., MemGPT (Packer et al., 2023b), Mem0 (Chhikara
et al., 2025), Memobase, MemoryOS (Kang et al., 2025a), MemOS (Li et al., 2025k), Zep (Rasmussen
et al., 2025), LangMem (LangChain, 2025), SuperMemory (Supermemory, 2025), Cognee (Cognee, 2025),
Memary (Memary, 2025), Pinecone, Chroma, Weaviate, Second Me, MemU, MemEngine (Zhang et al., 2025s),
Memori, ReMe (AgentScope, 2025), AgentMemory, and MineContext (MineContext, 2025). Many of them
explicitly separate short- and long-term stores and offer graph-based, profile-based, or modular memory spaces,
and some have begun to report results on memory-based benchmarks. The others typically provide scalable
vector or graph databases, APIs, and semantic or streaming entity layers that help organize context but
often leave agent behavior and evaluation protocols to the application. Overall, these frameworks are rapidly
maturing in their representational flexibility and system design.
7 Positions and Frontiers
This section articulates key positions and emerging frontiers in the design of memory systems for LLM-based
agents. Moving beyond descriptive surveys of existing methods, we focus on paradigm-level shifts that
redefine how memory is constructed, managed, and optimized in long-horizon agentic settings. Specifically, we
examine the transition from retrieval-centric to generative memory, from manually engineered to autonomously
managed memory systems, and from heuristic pipelines to reinforcement learning–driven memory control.
We further discuss how these shifts intersect with multimodal reasoning, multi-agent collaboration, and
trustworthiness, outlining open challenges and research directions that are likely to shape the next generation
of agent memory architectures.
7.1 Memory Retrieval vs. Memory Generation
7.1.1 Look Back: From Memory Retrieval to Memory Generation
Historically, the dominant paradigm in agent memory research has centered on memory retrieval. Under this
paradigm, the primary objective is to identify, filter, and select the most relevant memory entries from an
existing memory store given the current context. A large body of prior work focuses on improving retrieval
accuracy through better indexing strategies, similarity metrics, reranking models, or structured representations
such as knowledge graphs (Tan et al., 2025c; Memobase, 2025). In practice, this includes techniques such
as vector similarity search with dense embeddings, hybrid retrieval combining lexical and semantic signals,
hierarchical filtering, and graph-based traversal. These methods emphasize precision and recall in accessing
stored information, implicitly assuming that the memory base itself is already well formed.
Recently, however, increasing attention has shifted toward memory generation. Rather than treating memory
as a static repository to be queried, memory generation emphasizes the agent’s ability to actively synthesize
new memory representations on demand. The goal is not merely to retrieve and concatenate existing fragments,
but to integrate, compress, and reorganize information in a manner that is tailored to the current context and
future utility. This shift reflects a growing recognition that effective memory usage often requires abstraction
and recomposition, especially when raw stored information is noisy, redundant, or misaligned with the
immediate task.
Existing approaches to memory generation can be broadly grouped into two directions. One line of work
adopts a retrieve then generate strategy, where retrieved memory items serve as raw material for reconstruction.
In this setting, the agent first accesses a subset of relevant memories and then generates a refined memory
representation that is more concise, coherent, and context specific, as implemented in ComoRAG (Wang et al.,
2025f), G-Memory (Zhang et al., 2025c) and CoMEM (Wu et al., 2025d). This approach preserves grounding
in historical information while enabling adaptive summarization and restructuring. A second line of work
explores direct memory generation, in which memory is produced without any explicit retrieval step. Instead,
the agent generates memory representations directly from the current context, interaction history, or latent
internal states. Systems such as MemGen (Zhang et al., 2025d) and VisMem (Yu et al., 2025e) exemplify this
65
direction by constructing latent memory tokens that are customized to the task at hand, bypassing explicit
memory lookup altogether.
7.1.2 Future Perspective
Looking ahead, we anticipate that generative approaches will play an increasingly central role in agent memory
systems. We highlight three properties that future generative memory mechanisms should ideally exhibit.
First, generative memory should be context adaptive. Rather than storing generic summaries, the memory
system should generate representations that are explicitly optimized for the agent’s anticipated future needs.
This includes adapting the granularity, abstraction level, and semantic focus of memory to different tasks,
stages of problem solving, or interaction regimes.
Second, generative memory should support integration across heterogeneous signals. Agents increasingly
operate over diverse modalities and information sources, including text, code, tool outputs, and environmental
feedback. Memory generation provides a natural mechanism for fusing these fragmented signals into unified
representations that are more useful for downstream reasoning than raw concatenation or retrieval alone. We
hypothesize that latent memory (as discussed in Section 3.3) might be a promising technical path for this gaol.
Third, generative memory should be learned and self optimizing. Rather than relying on manually specified
generation rules, future systems should learn when and how to generate memory through optimization signals,
such as reinforcement learning or long horizon task performance. In this view, memory generation becomes
an integral component of the agent’s policy, co evolving with reasoning and decision making.
7.2 Automated Memory Management
7.2.1 Look-Back: From Hand-crafted to Automatically Constructed Memory Systems.
Existing agent memory systems (Xu et al., 2025c; Packer et al., 2023a) typically rely on manually designed
strategies to determine what information to store, when to use it, and how to update or retrieve it. By
guiding fixed LLMs with detailed instructions (Chhikara et al., 2025), predefined thresholds (Kang et al.,
2025a), or explicit human-crafted rules drafted by human experts (Xu et al., 2025c), system designers can
integrate memory modules into current agent frameworks with relatively low computational and engineering
cost, enabling rapid prototyping and deployment. Besides, they also offer interpretability, reproducibility, and
controlled, allowing the developers to precisely specify the state and behavior of memory. However, similar to
expert systems in other areas, such manually curated approaches suffer from significant limitations: they are
inherently inflexible and often fail to generalize across diverse, dynamic environments. Consequently, these
systems tend to underperform in long-term or open-ended interactions.
Recent developments in agent memory research begin to address these limitations by enabling the agents
themselves to autonomously manage the memory evolution and retrieval. For example, CAM (Li et al., 2025f)
empowers LLM agents to automatically cluster fine-grained memory entries into high-level abstract units.
Memory-R1 (Yan et al., 2025b) introduces an auxiliary agent equipped with a dedicated “memory manager”
tool to handle memory updates. Despite these advances, current solutions remain constrained: many are still
driven by manually engineered rules or are optimized for narrow, task-specific learning objectives, making
them difficult to generalize to open-ended settings.
7.2.2 Future Perspective
To support truly automated memory management, a promising direction is to integrate memory construction,
evolution, and retrieval directly into the agent’s decision loop via explicit tool calls, making the agent itself reason
about memory operations instead of depending on external modules or hand-crafted workflows. Compared
with existing designs that separate an agent’s internal reasoning process from its memory management actions,
an LLM agent can know precisely what memory actions it performs (e.g., add/update/delete/retrieval) in this
tool-based strategy, leading to more coherent, transparent, and contextually grounded memory behavior.
Another key frontier lies in developing self-optimizing memory structures adopting hierarchical and adaptive
architectures inspired by cognitive systems. First, hierarchical memory structure has been shown to improve
66
the efficiency and performance (Kang et al., 2025a). Beyond hierarchy, self-evolving memory systems that
dynamically link, index, and reconstruct memory entries enable the memory storage itself to self-organize
over time, supporting richer reasoning and reducing dependence on hand-designed rules. Ultimately, such
adaptive, self-organizing memory architectures pave the way toward agents capable of maintaining robust,
scalable, and truly autonomous memory management.
7.3 Reinforcement Learning Meets Agent MemoryRL-free
Memory
RL Partially
Involved
Fully RL-
driven
Hueristic
Threshold
Semantic
Search
Prompt-
based
Generation
Chunk
Concat
RL-based
Reranker
RL-trained
Memory
Manager
RL-trained
Memory
Writer
RL-trained
Working
Memory
No human
prior on
memory
system
Self-
designing
Memory
Arch.
Fully
agentic
control
e.g., MemGPT
e.g., MemOS,
Mem0
e.g., MemoryBank
e.g., A-Mem,
ExpeL,
ReasoningBank e.g., RMM
e.g., Mem-alpha
e.g., Memory-R1
e.g., Context folding,
Memory-as-Action,
ACON, MemGen
Figure 11 The evolution of RL-enabled agent memory systems. A conceptual progression from RL-free memory systems
based on heuristic or prompt-driven pipelines, to partially RL-involved designs where reinforcement learning governs
selected memory operations, and finally to fully RL-driven memory systems in which memory architectures and control
policies are learned end-to-end. This evolution reflects a broader paradigm shift from manually engineered memory
pipelines toward model-native, self-optimizing memory management in LLM-based agents.
7.3.1 Look-Back: RL is Internalizing Memory Management Abilities for Agents.
Reinforcement learning is rapidly reshaping the development paradigm of modern LLM-based agents. Across
a wide spectrum of agentic capabilities, including planning, reasoning, tool use, as well as across diverse
task domains such as mathematical reasoning, deep research, and software engineering, RL has begun to
play a central role in driving agent performance (Zhang et al., 2025f,k). Memory, as one of the foundational
components of agentic capability, follows a similar trend from pipeline-based to model-native paradigm (Sang
et al., 2025). The agent memory research community is collectively transitioning from early heuristic and
manually engineered designs to approaches in which RL increasingly governs key decisions. Looking ahead, it
is reasonable to expect that fully RL-based memory systems may eventually become the dominant direction.
Before discussing this trajectory in detail, we briefly outline the first stage of development. This transition, in
which memory management is progressively internalized and optimized through reinforcement learning, is
schematically illustrated in Figure 11.
RL-free Memory Systems A substantial portion of the agent memory literature surveyed earlier can
be categorized as RL-free memory systems. These approaches typically rely on heuristic or manually
specified mechanisms, such as fixed thresholding rules inspired by curves of forgetting, rigid semantic search
pipelines found in frameworks such as MemOS (Li et al., 2025k), Mem0 (Chhikara et al., 2025), and
MemoBase (Memobase, 2025), or simple concatenation-based strategies for storing memory chunks. In some
systems, an LLM participates in memory management in a way that appears agentic, yet the underlying
behavior is entirely prompt-driven. The LLM is asked to generate memory entries but has not received any
dedicated training for effective memory control, as seen in systems such as Dynamic Cheatsheet (Suzgun
et al., 2025), ExpeL (Zhao et al., 2024), EvolveR (Wu et al., 2025c), and G-Memory (Zhang et al., 2025c).
This class of methods has dominated early work in the field and is likely to remain influential for some time
due to its simplicity and practical accessibility.
67
RL-assisted Memory Systems As the field progressed, many works began to incorporate RL-based
methods into selected components of the memory pipeline. An early attempt in this direction is RMM (Tan
et al., 2025c), which employed a lightweight policy gradient learner to rank memory chunks after an initial
retrieval stage based on BM25 or other semantic similarity metrics. Later systems explored substantially
more ambitious designs. For example, Mem-α (Wang et al., 2025o) delegates the entire process of memory
construction to an agent trained with RL, and Memory-R1 (Yan et al., 2025b) employs a similar philosophy.
A rapidly expanding line of research investigates how an agent can autonomously fold, compress, and manage
context in ultra-long multi-turn tasks. This setting corresponds to the management of working memory (Kang
et al., 2025c; Ye et al., 2025a). Many of the leading systems in this area are trained with RL, including but not
limited to Context Folding (Sun et al., 2025a), Memory-as-Action (Zhang et al., 2025q), MemSearcher (Yuan
et al., 2025a), and IterResearch (Chen et al., 2025a). These RL-assisted approaches have already demonstrated
strong capabilities and point toward the increasing role of RL in future memory system design.
7.3.2 Future Perspective
Looking forward, we anticipate that fully RL-driven memory systems will constitute the next major stage in the
evolution of agent memory. We highlight two properties that such systems should ideally embody.
• First, memory architectures managed by agents should minimize reliance on human-engineered priors.
Many existing frameworks inherit design patterns inspired by human cognition, such as cortical or
hippocampal analogies (Gutierrez et al., 2024), or predefined hierarchical taxonomies that partition
memory into episodic, semantic, and core categories (Wang and Chen, 2025). Although these abstractions
have been useful for grounding early work, they may not represent the most effective or natural structures
for artificial agents operating in complex environments. A fully RL-driven setting offers the possibility
for agents to invent novel and potentially more suitable memory organizations that emerge directly
from optimization dynamics rather than human intuition. In this view, the agent is encouraged to
design new memory formats, storage schemas, or update rules through RL incentives, enabling memory
architectures that are adaptive and creative rather than handcrafted.
• Second, future memory systems should provide agents with complete control over all stages of memory
management. Current RL-assisted approaches typically intervene in only a subset of the memory
lifecycle. For instance, Mem-α automates certain aspects of memory writing yet still relies on manually
defined retrieval pipelines, whereas systems such as MemSearcher (Yuan et al., 2025a) focus primarily
on short-term working memory without addressing long-term consolidation or evolution. A fully agentic
memory system would require the agent to autonomously handle multi-granular memory formation,
memory evolution, and memory retrieval in an integrated manner. Achieving this level of control will
almost certainly require end-to-end RL training, since heuristic or prompt-based methods are insufficient
for coordinating the complex interactions among these components across long-time horizons.
Together, these two directions suggest a future in which memory is not merely an auxiliary mechanism bolted
onto an LLM agent, but rather a fully learnable and self-organizing subsystem that coevolves with the agent
through RL. Such systems hold the potential to enable genuinely continual learning and long-term competence
in artificial agents.
7.4 Multimodal Memory
7.4.1 Look-Back
As research on text-based memory becomes increasingly mature and extensively explored, and as multimodal
large language models and unified models that jointly support multimodal understanding and generation
continue to advance, attention has naturally expanded toward multimodal memory. This shift reflects a broader
recognition that many real-world agentic settings are inherently multimodal, and that memory systems limited
to text alone are insufficient to support long-horizon reasoning and interaction in complex environments.
Existing efforts on multimodal memory can be broadly grouped into two complementary directions. The first
focuses on enabling multimodal agents to store, retrieve, and utilize memories derived from diverse sensory
inputs (Long et al., 2025; Zuo et al., 2025). This direction is a natural extension of agent memory, since agents
68
operating in realistic environments inevitably encounter heterogeneous data sources, including images, audio,
video, and other non-textual signals (Xie et al., 2024). The degree of progress in multimodal memory closely
follows the maturity of corresponding modalities. Visual modalities such as images and videos have received
the most attention, leading to a growing body of work on visual and video memory mechanisms that support
tasks such as visual grounding, temporal tracking, and long-term scene consistency (Long et al., 2025; Wang
et al., 2024g; Gurukar and Kadav, 2025; Yu et al., 2025e; Bo et al., 2025; Wang et al., 2025p; Li et al., 2024d).
In contrast, memory systems for audio and other modalities remain relatively underexplored (Li et al., 2025a).
The second direction treats memory as an enabling component for unified models. In this setting, memory
is leveraged not primarily to support agent decision making, but to enhance multimodal generation and
consistency. For example, in image and video generation systems, memory mechanisms are often used to
preserve entity consistency, maintain world state across frames, or ensure coherence across long generation
horizons (Yu et al., 2025b). Here, memory serves as a stabilizing structure that anchors generation to
previously produced content, rather than as a record of agent experience per se.
7.4.2 Future Perspective
Looking forward, multimodal memory is likely to become an indispensable component of agentic systems.
As agents increasingly move toward embodied and interactive settings, their information sources will be
inherently multimodal, spanning perception, action, and environmental feedback. Effective memory systems
must therefore support the storage, integration, and retrieval of heterogeneous signals in a unified manner.
Despite recent progress, there is currently no memory system that provides truly omnimodal support. Most
existing approaches remain specialized to individual modalities or loosely coupled across modalities. A key
future challenge lies in designing memory representations and operations that can flexibly accommodate
diverse modalities while preserving semantic alignment and temporal coherence. Moreover, multimodal
memory must evolve beyond passive storage to support abstraction, cross-modal reasoning, and long-term
adaptation. Addressing these challenges will be essential for enabling agents that can operate robustly and
coherently in rich, multimodal environments.
7.5 Shared Memory in Multi-Agent Systems
7.5.1 Look-Back: From Isolated Memories to Shared Cognitive Substrates
As LLM-based multi-agent systems (MAS) have gained prominence, shared memory has emerged as a key
mechanism for enabling coordination, consistency, and collective intelligence. Early multi-agent frameworks
primarily relied on isolated local memories coupled with explicit message passing, where agents exchanged
information through dialogue histories or task-specific communication protocols (Qian et al., 2024; Wu et al.,
2024b; Hu et al., 2025b; Zhang et al., 2025i). While this design avoided direct interference between agents, it
often suffered from redundancy, fragmented context, and high communication overhead, especially as team
size and task horizon increased.
Subsequent work introduced centralized shared memory structures, such as global vector stores, blackboard
systems, or shared documents (Hong et al., 2024), accessible to all agents. These designs enabled a form
of team-level memory that supported joint attention, reduced duplication, and facilitated long-horizon
coordination. Representative systems demonstrated that shared memory could serve as a persistent common
ground for planning, role handoff, and consensus building (Rezazadeh et al., 2025b; Xu et al., 2025a). However,
naive global sharing also exposed new challenges, including memory clutter, write contention, and the lack of
role- or permission-aware access control.
7.5.2 Future Perspective
Looking forward, shared memory is likely to evolve from a passive repository into an actively managed and
adaptive collective representation. One important direction is the development of agent-aware shared memory,
where read and write behaviors are conditioned on agent roles, expertise, and trust, enabling more structured
and reliable knowledge aggregation.
69
Another promising avenue lies in learning-driven shared memory management. Rather than relying on hand-
designed policies for synchronization, summarization, or conflict resolution, future systems may train agents
to decide when, what, and how to contribute to shared memory based on long-horizon team performance.
Finally, as MAS increasingly operate in open-ended and multimodal environments, shared memory must
support abstraction across heterogeneous signals while maintaining temporal and semantic coherence, for
which we believe latent memory exhibits a promising path (Wu et al., 2025d). Advancing in these directions
will be critical for scaling shared memory from a coordination aid into a foundation for robust collective
intelligence.
7.6 Memory for World Model
7.6.1 Look-Back
The core objective of a World Model is to construct an internal environment capable of high-fidelity simulation
of the physical world. These systems serve as the critical infrastructure for next-generation artificial intelligence.
The core attribute of world model is to generate content that is both infinitely extensible and interactive
in real time. Unlike traditional video generation that creates fixed-length clips, world models operate in an
iterative manner by receiving actions at each step and predicting the next state to provide continuous feedback.
In this iterative framework, the memory mechanism becomes the cornerstone of the system. Memory stores
and maintains the spatial and semantic information or hidden states from the previous time step. It ensures
that the generation of the next chunk maintains long-term consistency with the preceding context regarding
scene layout, object attributes, and motion logic. Essentially, the memory mechanism enables world models
to handle long-term temporal dependencies and realize trustworthy simulation interactions.
Previously, memory modeling relied on simplistic buffering approaches. Frame Sampling conditioned generation
on a few historical frames (Bruce et al., 2024). While intuitive, this led to context fragmentation and perceptual
drift as early details were lost. Sliding Window methods adapted LLM techniques like attention sinks and
local KV caches (Liu et al., 2025e). Although this resolved computational bottlenecks, it restricted memory
to a fixed window. Once an object left this view, the model effectively forgot it, preventing complex tasks like
loop closure. By late 2025, the field shifted from finite context windows to structured state representations.
Current architectures follow three main paths:
• State-Space Models (SSMs) architectures like Long-Context SSMs utilize Mamba-style backbones (Po
et al., 2025; Yu et al., 2025f). These compress infinite history into a fixed-size recursive state, enabling
theoretically infinite memory capacity with constant inference costs.
• Explicit Memory Banks. Unlike compressed states, these systems maintain an external storage of
historical representations to support precise recall. Approaches differ in their structuring logic: UniWM
employs a hierarchical design, separating short-term perception from long-term history via feature-based
similarity gating (Dong et al., 2025b). Conversely, retrieval-based approaches like WorldMem and
Context-as-Memory (CaM) maintain a flat bank of past contexts, utilizing geometric retrieval (e.g.,
FOV overlap) to dynamically select relevant frames for maintaining 3D scene consistency (Xiao et al.,
2025c; Yu et al., 2025c).
• Sparse Memory and Retrieval To balance long-term adherence with efficiency, Genie Envisioner and Ctrl-
World utilize sparse memory mechanisms (Liao et al., 2025b; Guo et al., 2025). These models augment
current observations by injecting sparsely sampled historical frames or retrieving pose-conditioned
context to anchor predictions and prevent drift during manipulation tasks.
7.6.2 Future Perspective
From an architectural perspective, the field is undergoing a fundamental transition from Data Caching which
focuses on passive retention to State Simulation which focuses on active maintenance. This evolution is currently
crystallizing into two distinct paradigms that aim to solve the conflict between real-time responsiveness and
long-term logical consistency.
• The Dual-System Architecture. Inspired by cognitive science, world models could be bifurcated into
fast and slow components. System 1 represents the fast and instinctive layer that handles immediate
70
physics and fluid interaction using efficient backbones like SSMs. System 2 represents the slow and
deliberative layer that handles complex reasoning, planning, and world consistency using large-scale
VLMs or explicit memory databases.
• Active Memory Management. Passive mechanisms are being superseded by Active Memory Policies.
Instead of treating memory as a fixed buffer that blindly stores recent history, new models are designed as
Cognitive Workspaces that actively curate, summarize, and discard information based on task relevance.
Recent empirical studies demonstrate that such active memory management significantly outperforms
static retrieval methods in handling functional infinite context. This shift marks the move from simply
remembering the last N tokens to maintaining a coherent and queryable world state.
7.7 Trustworthy Memory
7.7.1 Look-Back: From Trustworthy RAG to Trustworthy Memory
As shown throughout this survey, memory plays a foundational role in enabling agentic behavior, which
supports persistence, personalization, and continual learning. However, as memory systems become more
deeply embedded into LLM-based agents, the question of trustworthiness has become paramount.
Earlier concerns around hallucination and factuality in retrieval-augmented generation (RAG) systems (Niu
et al., 2024; Sun et al., 2025e; Lu et al., 2025c) have now evolved into a broader trust discourse for memory-
augmented agents. Similar to RAG, one major motivation for using external or long-term memory is to
reduce hallucinations by grounding model outputs in retrievable, factual content (Ru et al., 2024; Wang
et al., 2025c). However, unlike RAG, agent memory often stores user-specific, persistent, and potentially
sensitive content, ranging from factual knowledge to past interactions, preferences, or behavioral traces. This
introduces additional challenges in privacy, interpretability, and safety.
Recent work by Wang et al. (2025b) demonstrates that memory modules can leak private data through indirect
prompt-based attacks, highlighting the risk of memorization and over-retention. Concurrently, Wu et al.
(2025g) argues that agent memory systems must support explicit mechanisms for access control, verifiable
forgetting, and auditable updates to remain trustworthy. Notably, such threats are magnified in agent scenarios
where memory persists across long time horizons.
Explainability also remains a critical bottleneck. While explicit memory, such as text logs or key-value stores,
offers some transparency, users and developers still lack tools to trace which memory items were retrieved, how
they influenced generation, or whether they were misused. In this regard, diagnostic tools like RAGChecker (Ru
et al., 2024) and conflict-resolution frameworks such as RAMDocs with MADAM-RAG (Wang et al., 2025d)
provide inspiration for tracing memory usage and reasoning under uncertainty.
Moreover, beyond individual memory, Shi et al. (2025d) and Rezazadeh et al. (2025a) highlight the emerging
importance of collective privacy in shared or federated memory systems, which may operate across multi-agent
deployments or organizations. All these developments collectively signal a need to elevate trust as a first-class
principle in memory design.
7.7.2 Future Perspective
Looking ahead, we argue that trustworthy memory must be built around three interlinked pillars: privacy
preservation, explainability, and hallucination robustness—each demanding architectural and algorithmic
innovations.
For privacy, future systems should support granular permissioned memory, user-governed retention policies,
encrypted or on-device storage, and federated access where needed (Wu et al., 2025g; Shi et al., 2025d;
Rezazadeh et al., 2025a). Techniques like differential privacy, memory redaction, and adaptive forgetting
(e.g., decay-based models or user-erasure interfaces) can serve as safeguards against both memorization and
leakage (Chhikara et al., 2025).
Explainability requires moving beyond visible content to include traceable access paths, self-rationalizing
retrievals, and possibly counterfactual reasoning (e.g., what would have changed without this memory?) (Ope-
71
nAI, 2024; Zhang et al., 2025u). Visualizations of memory attention, causal graphs of memory influence, and
user-facing debugging tools may become standard components.
Hallucination mitigation will benefit from continued advances in conflict detection, multi-document reasoning,
and uncertainty-aware generation. Strategies such as abstention under low-confidence retrieval, fallback to
model priors (Wang et al., 2025c), or multi-agent cross-checking (Hu et al., 2024) are promising. Beyond
behavioral safeguards, emerging mechanistic interpretability techniques offer a complementary direction by
analyzing how internal representations and reasoning circuits contribute to hallucinated outputs. Methods
such as representation-level probing and reasoning-path decomposition enable finer-grained diagnosis of where
hallucinations originate, and provide principled tools for intervention and control (Sun et al., 2025e,c).
In the long term, we envision memory systems governed by OS-like abstractions: segmented, version-controlled,
auditable, and jointly managed by agent and user (Packer et al., 2023b). Building such systems will require
coordinated efforts across representation learning, system design, and policy control. As LLM agents begin to
operate in persistent, open-ended environments, trustworthy memory will not just be a desirable feature—but
a foundational requirement for real-world deployment.
7.8 Human-Cognitive Connections
7.8.1 Look Back
The architecture of contemporary agent memory systems has converged with foundational models of human
cognition established over the last century. The prevailing design, which couples a capacity-limited context
window with massive external vector databases, mirrors the Atkinson-Shiffrin multi-store model (Atkinson and
Shiffrin, 1968), effectively instantiating an artificial counterpart to the distinction between working memory
and long-term memory (Baddeley, 2012). Furthermore, the partitioning of agent memory into interaction logs,
world knowledge, and code-based skills exhibits a striking structural alignment with Tulving’s classification
of episodic, semantic, and procedural memory (Tulving, 1972; Squire, 2004). Current frameworks (Zhong
et al., 2024; Park et al., 2023; Gutierrez et al., 2024; Li et al., 2025k) operationalize these biological categories
into engineering artifacts, where episodic memory provides autobiographical continuity and semantic memory
offers generalized world knowledge.
Despite these structural parallels, a fundamental divergence remains in the dynamics of retrieval and
maintenance. Human memory operates as a constructive process, where the brain actively reconstructs
past events based on current cognitive states rather than replaying exact recordings (Schacter and Addis,
2007). In contrast, the majority of existing agent memory systems rely on verbatim retrieval mechanisms like
RAG, treating memory as a repository of immutable tokens to be queried via semantic similarity (Packer
et al., 2023b; Chhikara et al., 2025). Consequently, while agents possess a veridical record of the past, they
lack the biological capacity for memory distortion, abstraction, and the dynamic remodeling of history that
characterizes human intelligence.
7.8.2 Future Perspective
To bridge the gap between static storage and dynamic cognition, the next generation of agents must evolve
beyond exclusive online updating by incorporating offline consolidation mechanisms analogous to biological
sleep. Drawing from the Complementary Learning Systems (CLS) theory (Kumaran et al., 2016; McClelland
et al., 1995), future architectures will likely introduce dedicated consolidation intervals where agents decouple
from environmental interaction to engage in memory reorganization and generative replay (Mattar and Daw,
2018). During these offline periods, agents can autonomously distill generalizable schemas from raw episodic
traces, perform active forgetting to prune redundant noise (Anderson and Hulbert, 2021), and optimize their
internal indices without the latency constraints of real-time processing.
Ultimately, this evolution suggests a paradigm shift in memory forms and functions: moving from explicit text
retrieval to generative reconstruction. Future systems may utilize generative memory (Zhang et al., 2025d)
where the agent synthesizes latent memory tokens on demand, mirroring the brain’s reconstructive nature. By
integrating sleep-like consolidation cycles, agents will evolve from entities that merely archive data to those
that internalize experience, resolving the stability-plasticity dilemma by periodically compacting vast episodic
streams into efficient, parametric intuition.
72
8 Conclusion
This survey has examined agent memory as a foundational component of modern LLM-based agentic systems.
By framing existing research through the unified lenses of forms, functions, and dynamics, we have clarified
the conceptual landscape of agent memory and situated it within the broader evolution of agentic intelligence.
On the level of forms, we identify three principal realizations: token-level, parametric, and latent memory,
each of which has undergone distinct and rapid advances in recent years, reflecting fundamentally different
trade-offs in representation, adaptability, and integration with agent policies. On the level of functions, we
move beyond the coarse long-term versus short-term dichotomy prevalent in prior surveys, and instead propose
a more fine-grained and encompassing taxonomy that distinguishes factual, experiential, and working memory
according to their roles in knowledge retention, capability accumulation, and task-level reasoning. Together,
these perspectives reveal that memory is not merely an auxiliary storage mechanism, but an essential substrate
through which agents achieve temporal coherence, continual adaptation, and long-horizon competence.
Beyond organizing prior work, we have identified key challenges and emerging directions that point toward
the next stage of agent memory research. In particular, the increasing integration of reinforcement learning,
the rise of multimodal and multi-agent settings, and the shift from retrieval-centric to generative memory
paradigms suggest a future in which memory systems become fully learnable, adaptive, and self-organizing.
Such systems hold the potential to transform large language models from powerful but static generators into
agents capable of sustained interaction, self-improvement, and principled reasoning over time.
We hope this survey provides a coherent foundation for future research and serves as a reference for both
researchers and practitioners. As agentic systems continue to mature, the design of memory will remain a
central and open problem, one that is likely to play a decisive role in the development of robust, general, and
enduring artificial intelligence.