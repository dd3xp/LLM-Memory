
Figure 4: Memory as a Gate (MAG) Architecture. This architecture, similarly, has the three branches of (1) core, (2)
contextual memory, and (3) persistent memory. It, however, incorporates only persistent memory into the context and
combine memory with the core branch using a gating mechanism. At test time, the behavior is the same as Figure 2.
the long-term memory to store only useful information from the current context. That is, not all tokens in each segment
are useful and memorizing all of them can result in memory overflow. Therefore, attention is helping the memory to
understand which information is useful, better managing the memory capacity. (3) At test time: (i) persistent memory
parameters are fixed as they encodes the knowledge about the task, which should not be changed; (ii) the attention module
weights are in-context learner; and (iii) the long-term memory module is still learning (memorizing) the information at test
time. That is, we update the weights of the neural memory even at test time as weights are encoding the abstraction of
long past.
4.2 Gated Memory
In the next variant (see Figure 4), in one branch, we directly use the input data to update the long-term memory, and in the
second branch, we use a sliding window attention (SWA):
 ̃𝑥 = 𝑝1 𝑝2 . . . 𝑝𝑁𝑝
 || 𝑥, (26)
𝑦 = SW-Attn∗ (  ̃𝑥) , (27)
𝑜 = 𝑦 ⊗ M (  ̃𝑥), (28)
where SW-Attn∗ is sliding window attention with prefix (see Figure 3b). Note that, contrary to the previous design, we are
not segmenting the input data. Also, we abuse the notation and use M (𝑥) to refer to the final output of the memory after
all recursion over the tokens of the sequence. In the above equation, ⊗ can be any non-linear gating. In our experiments,
we normalize the outputs 𝑦 and M (  ̃𝑥) using learnable vector-valued weights, followed by a non-linearity 𝜎 (.).
The overall attention mask of this design is shown in Figure 3b. In this design, sliding window attention is act as a precise
short-term memory, while the neural memory module is acting as a fading memory for the model. This architecture design
can also be seen as a multi-head architecture where the structure of heads are different (X. Dong et al. 2024).
4.3 Memory as a Layer
The last variant uses the neural Memory As a Layer (MAL) of a deep neural network (see Figure 5). This architecture
design is more common in the literature, where the hybrid models stack recurrent models with full or sliding window
attentions. Given input 𝑥, we have:
 ̃𝑥 = 𝑝1 𝑝2 . . . 𝑝𝑁𝑝
 || 𝑥, (29)
𝑦 = M (  ̃𝑥), (30)
𝑜 = SW-Attn (𝑦) , (31)
10
Figure 5: Memory as a Layer (MAL) Architecture. In this architecture, the memory layer is responsible to compress the
past and current context before the attention module.
where SW-Attn is sliding window attention. The main drawback of this design is that the power of the model is limited by
each of the layers and so it cannot take advantage of the complementary data processing of attention and neural memory
module. In our experiments, for evaluating memory in this design, we use a similar architecture as H3 (D. Y. Fu et al. 2023),
where we replace the the sequence model with our neural memory module (LMM).
Memory Without Attention. Although in the above, we discussed MAL as the combination of LMMs and attention in
a sequential manner, one simple variant of MAL is to treat LMM as a sequence model without any attention. From the
memory perspective, as discussed in Section 1, we expect each part of the memory system to work independently, even if
other components are disturbed. Therefore, a long-term memory module should still be a powerful model even without
short-term memory (i.e., attention). We refer to this variant as LMM or Titans (LMM) in our experiments. We provide
additional discussions on the connection of Titans and other modern recurrent models in Appendix C.
4.4 Architectural Details
For the sake of simplicity and presentation, we avoid discussing the implementation details like using residual connection,
gating with linear layer, and normalization. In all blocks, we use residual connections. In our implementation, we use
SiLU(.) activation (Elfwing, Uchibe, and Doya 2018) as the non-linear activation for computing query, key, and values and
normalize queries and keys using ℓ2-norm.
Convolution. Following the recent modern linear recurrent models (Gu and Dao 2024; S. Yang, Kautz, and Hatamizadeh
2024), we incorporate a 1D depthwise-separable convolution layer after each of the query, key, and value projections.
While not significantly affect the performance, these 1D convolutions have shown performance improvement and are also
computationally efficient.
Gating. We also follow the recent architectures that use normalization and gating with a linear layer before the final
output projection (Mehta et al. 2023).
Theorem 4.1. Contrary to Transformers, diagonal linear recurrent models, and DeltaNet, all of which are limited to TC0 (Merrill,
Petty, and Sabharwal 2024), Titans are capable of solving problems beyond TC 0, meaning that Titans are theoretically more
expressive than Transformers and most modern linear recurrent models in state tracking tasks.
5 Experiments
Next, we evaluate the performance of Titans and its variants in language modeling, commonsense reasoning, needle
in haystack, DNA modeling, and time series forecasting tasks1. In more details, in this section, we answer the
following empirical questions: (1) How do Titans perform compared to baselines in downstream tasks? (see §5.2,
1In the first version of the work, we aim to provide insights/evidences about why the learning paradigms of Titans are effective. We are working on
finalizing the results of larger models and will report them in the next version.
11
§5.6, and §5.7); (2) What is the actual context length of Titans? (see §5.3 and §5.4); (3) How do Titans scale with respect to
context length? (see §5.8); (4) How the depth of memory can affect both performance and efficiency? (see §5.5); and (5)
What is the contribution of each Titans’ component in its performance? (see §5.9).
5.1 Experimental Setup
Models. In our experiments, we focus on the three variants of Titans, which we refer to as: Titans with (1) Memory as a
Context (MAC), (2) Memory as a Gate (MAG), and (3) Memory as a Layer (MAL) as well as (4) neural memory module
alone. The reason behind using our long-term memory as a separate module is based on our definition of learning. As
discussed in Section 1, we define learning a process for acquiring effective and useful memory. Accordingly, we expect our
long-term memory to effectively learn from data, even without attention. For each of these models, we consider four scales
with: (i) 170M, (ii) 340M, (iii) 400M, and (iv) 760M parameters. While the first three are trained on 15B tokens sampled
from FineWeb-Edu dataset (Penedo et al. 2024), the last one is trained on 30B tokens from the same dataset.
Baselines. We compare our models with the state-of-the-art linear recurrent models, Transformers, and hybrid models
(recurrent + attention). More specifically in language tasks, we compare with Transformer++ (Touvron et al. 2023),
RetNet (Yutao Sun et al. 2023), Gated Linear Attention (GLA) (S. Yang, B. Wang, Shen, et al. 2024), Mamba (Gu and Dao
2024), Mamba2 (Dao and Gu 2024), DeltaNet (S. Yang, B. Wang, Yu Zhang, et al. 2024), TTT (Yu Sun et al. 2024), and Gated
DeltaNet (S. Yang, Kautz, and Hatamizadeh 2024). In needle in haystack tasks, we also compare with GPT4 (Achiam et al.
2023), Llama3 with RAG (Touvron et al. 2023), RecurrentGemma2-9B (Botev et al. 2024), and Mistral (Jiang et al. 2023)
models, all of which are provided in the benchmark (Yuri Kuratov et al. 2024). In time series tasks, we compare with
Mamba-based (Behrouz, Santacatterina, and Zabih 2024), Transformer-based (Y. Liu et al. 2023; Nie et al. 2022; Yunhao
Zhang and Yan 2023), and linear models (Das et al. 2023; Z. Li et al. 2023; H. Wu et al. 2023; Zeng et al. 2023).
Training. In the training, we follow the training procedure of S. Yang, Kautz, and Hatamizadeh (2024), and use LLama 2
tokenizer with a vocabulary size of 32K and use training length of 4K tokens. We employ AdamW optimizer with learning
rate of 4𝑒-4 with cosine annealing schedule with batch size of 0.5M tokens, and weight decay of 0.1.
5.2 Language Modeling
We first focus on the perplexity in language modeling and also commonsense reasoning tasks. The results for Titans’
variants and also baselines with three different sizes of 340M, 400M, and 760M are reported in Table 1. Among non-hybrid
models, including Transformer++, our neural memory module achieves the best performance in both perplexity and
accuracy measures. Comparing our neural memory module and TTT, which is also a gradient-based recurrent model can
show us the importance of our weight decay as well as the momentum. As discussed earlier, the weight decay can be
interpreted as a gating mechanism to forget the past data, when it is needed. Also, momentum can help us better manage
the memory by providing additional memory for the surprise metric. While some baselines also take advantage of gating
mechanism, e.g., Mamba, Mamba2, and Gated DeltaNet, the superior performance of our neural memory module shows
the importance of both our surprise mechanism and having deep and non-linear memory. We further discuss the later in
Section 5.5.
Comparing the hybrid models, we found that all three variants of Titans (MAC, MAG, and MAL) outperform both Samba
(Mamba + attention) and Gated DeltaNet-H2 (Gated DeltaNet + atttention). We attribute the superior performance of Titans
(MAL) to the power of neural memory module as the architecture design and used attention are all the same. Comparing
Titans (MAG) and (MAC), we find that while their performance are close, MAC performs better when dealing with longer
dependencies in the data. Interestingly, both MAG and MAC outperform MAL variant, which due to using the same
modules, we attribute this to the architecture design of these models. This finding is particularly important as the current
hybrid models (except Hymba (X. Dong et al. 2024)) in the literature are using MAL-style combination of recurrent models
and attention.
5.3 Needle in a Haystack
Scaling a model to longer context window is not always equivalent to being effective for very long sequences (Hsieh
et al. 2024). The needle-in-a-haystack (NIAH) task is designed to measure the actual effective context length of models.
In this task, we evaluate the model on retrieving a piece of information (i.e., the “needle”) from long distractor texts (i.e.,
12
Table 1: Performance of Titans and recurrent- and Transformer-based baselines on language modeling and common-sense
reasoning tasks. Hybrid models are marked with ∗. The best results among simple and hybrid models are highlighted.
Model Wiki. LMB. LMB. PIQA Hella. Wino. ARC-e ARC-c SIQA BoolQ Avg.
ppl ↓ ppl ↓ acc ↑ acc ↑ acc_n ↑ acc ↑ acc ↑ acc_n ↑ acc ↑ acc ↑ ↑
340M params / 15B tokens
Transformer++ 31.52 41.08 30.76 62.98 34.76 50.53 45.21 24.05 36.81 58.24 42.92
RetNet 32.50 49.73 28.24 62.61 34.15 50.91 44.27 23.62 36.79 59.72 42.54
GLA 28.51 43.02 28.73 64.05 35.96 50.00 54.19 24.29 37.13 58.39 44.09
Mamba 30.83 40.21 29.94 63.79 35.88 49.82 49.24 24.56 35.41 60.07 43.59
DeltaNet 28.65 47.30 28.43 63.52 35.95 49.63 52.68 25.37 37.96 58.79 44.04
TTT 27.44 34.19 30.06 63.97 35.71 50.08 53.01 26.11 37.32 59.83 44.51
Gated DeltaNet 27.01 30.94 34.11 63.08 38.12 51.60 55.28 26.77 34.89 59.54 45.42
Titans (LMM) 26.18 29.97 34.98 64.73 39.61 51.85 55.60 28.14 34.52 59.99 46.17
Titans (MAC)∗ 25.43 28.13 36.00 65.32 40.35 51.21 58.17 29.00 38.63 60.18 47.36
Titans (MAG)∗ 25.07 28.72 36.71 64.88 40.56 52.49 57.72 28.16 39.75 60.01 47.54
Titans (MAL)∗ 24.69 28.80 35.74 64.97 39.44 51.97 56.58 28.21 38.14 57.32 46.55
400M params / 15B tokens
Transformer++ 30.63 37.37 29.64 64.27 37.72 51.53 54.95 27.36 38.07 61.59 45.64
RetNet 29.92 46.83 29.16 65.23 36.97 51.85 56.01 27.55 37.30 59.66 45.47
HGRN2 32.33 47.14 26.12 64.52 35.45 52.24 55.97 25.51 37.35 59.02 44.52
GLA 27.96 36.66 27.86 65.94 37.41 49.56 56.01 26.36 38.94 59.84 45.24
Mamba 29.22 39.88 29.82 65.72 37.93 50.11 58.37 26.70 37.76 61.13 45.94
Mamba2 26.34 33.19 32.03 65.77 39.73 52.48 59.00 27.64 37.92 60.72 46.91
DeltaNet 27.69 44.04 29.96 64.52 37.03 50.82 56.77 27.13 38.22 60.09 45.57
TTT 26.11 31.52 33.25 65.70 39.11 51.68 58.04 28.99 38.26 59.87 46.86
Gated DeltaNet 25.47 29.24 34.40 65.94 40.46 51.46 59.80 28.58 37.43 60.03 47.26
Samba∗ 25.32 29.47 36.86 66.09 39.24 51.45 60.12 27.20 38.68 58.22 47.23
Gated DeltaNet-H2∗ 24.19 28.09 36.77 66.43 40.79 52.17 59.55 29.09 39.04 58.56 47.69
Titans (LMM) 25.03 28.99 35.21 65.85 40.91 52.19 59.97 29.20 38.74 60.85 47.83
Titans (MAC)∗ 25.61 27.73 36.92 66.39 41.18 52.80 60.24 29.69 40.07 61.93 48.65
Titans (MAG)∗ 23.59 27.81 37.24 66.80 40.92 53.21 60.01 29.45 39.91 61.28 48.60
Titans (MAL)∗ 23.93 27.89 36.84 66.29 40.74 52.26 59.85 29.71 38.92 58.40 47.87
760M params / 30B tokens
Transformer++ 25.21 27.64 35.78 66.92 42.19 51.95 60.38 32.46 39.51 60.37 48.69
RetNet 26.08 24.45 34.51 67.19 41.63 52.09 63.17 32.78 38.36 57.92 48.46
Mamba 28.12 23.96 32.80 66.04 39.15 52.38 61.49 30.34 37.96 57.62 47.22
Mamba2 22.94 28.37 33.54 67.90 42.71 49.77 63.48 31.09 40.06 58.15 48.34
DeltaNet 24.37 24.60 37.06 66.93 41.98 50.65 64.87 31.39 39.88 59.02 48.97
TTT 24.17 23.51 34.74 67.25 43.92 50.99 64.53 33.81 40.16 59.58 47.32
Gated DeltaNet 21.18 22.09 35.54 68.01 44.95 50.73 66.87 33.09 39.21 59.14 49.69
Samba∗ 20.63 22.71 39.72 69.19 47.35 52.01 66.92 33.20 38.98 61.24 51.08
Gated DeltaNet-H2∗ 19.88 20.83 39.18 68.95 48.22 52.57 67.01 35.49 39.39 61.11 51.49
Titans (LMM) 20.04 21.96 37.40 69.28 48.46 52.27 66.31 35.84 40.13 62.76 51.56
Titans (MAC) 19.93 20.12 39.62 70.46 49.01 53.18 67.86 36.01 41.87 62.05 52.51
Titans (MAG) 18.61 19.86 40.98 70.25 48.94 52.89 68.23 36.19 40.38 62.11 52.50
Titans (MAL) 19.07 20.33 40.05 69.99 48.82 53.02 67.54 35.65 30.98 61.72 50.97
the “haystack”). In this part, we use Single NIAH (S-NIAH) task from RULER benchmark (Hsieh et al. 2024) and evaluate
Titans and baselines on sequences with length 2K, 4K, 8K, and 16K. The results are reported in Table 2. Neural Memory
module achieves the best results compare to baselines in all three tasks. We attribute this superior performance to three
key differences of Titans with existing sequence models: (1) Compared to TTT, our Neural Memory can better handle the
memory capacity by using momentum and also the forgetting mechanism (i.e., weight decay). Therefore, with increasing
the sequence length, the performance of Neural Memory does not drop and show a consistent trend; (2) Compared to
Mamba2, which has the gating (forgetting) mechanism, Titans have deep non-linear memory, resulting in better memory
management. Also, contrary to our neural memory and DeltaNet, Mamba2 is not capable of removing a memory and so
13
Table 2: Performance of Titans and baselines on S-NIAH task from RULER benchmark. The best results among simple
and hybrid models are highlighted.
Model S-NIAH-PK S-NIAH-N S-NIAH-W
2K 4K 8K 16K 2K 4K 8K 16K 2K 4K 8K 16K
TTT 98.4 98.8 98.0 88.4 60.2 36.6 10.2 4.4 78.8 28.0 4.4 0.0
Mamba2 98.6 61.4 31.0 5.4 98.4 55.8 14.2 0.0 42.2 4.2 0.0 0.0
DeltaNet 96.8 98.8 98.6 71.4 47.2 15.4 12.8 5.4 46.2 20.0 1.6 0.0
Titans (LMM) 99.8 98.4 98.2 96.2 100.0 99.8 93.4 80.2 90.4 89.4 85.8 80.6
Titans (MAC) 99.2 98.8 99.0 98.4 99.6 98.2 97.6 97.4 98.2 98.2 95.6 95.2
Titans (MAG) 99.4 98.0 97.4 97.4 99.2 98.8 97.2 98.6 98.0 98.0 90.2 88.2
Titans (MAL) 98.8 98.6 98.8 97.8 99.8 98.1 96.8 96.4 98.0 97.4 92.0 90.4
(a) Few-shot Setup (b) Fine-Tuning Setup
Figure 6: Performance of Titans and baselines on BABILong benchmark. Titans (MAC) outperforms all baselines, including
extremely large models, e.g., GPT4.
we can see a significant drop in performance when increasing the sequence length; (3) Compared to DeltaNet, although it
is capable of removing memory using delta rule, it cannot erase the memory, lacking forgetting mechanism. Finally, As
expected we can see on par or better results when using Titans variants, where the best results correspond to MAC.
5.4 BABILong Benchmark
In the previous section we discussed the results on a simple NIAH tasks where a single needle needs to be retrieved.
Although Titans showed better performance compared to baselines, their true advantage over very long sequences is still
hidden. To this end, in this section, we use a harder task from BABILong benchmark (Yuri Kuratov et al. 2024), in which
the model needs to reason across facts distributed in extremely long documents. We follow the original experimental setup
and training process in the benchmark. There are two settings: (1) Few-shot setting, in which we use large pre-trained
models, and (2) fine-tuning setting, where we fine-tune the MAC variant of Titans to compare it with other fine-tuned
baselines. The results for few-shot setting are reported in Figure 6a. In this setup, we can see Titans outperform all
baselines–i.e., Mamba2.8B (Gu and Dao 2024), RWKV-6-7B (Peng, Goldstein, et al. 2024), RecurrentGemma-9B (Botev et al.
2024), Gemma-9B (Team et al. 2024), Llama3.1-8B (Touvron et al. 2023), GPT-4, and GPT4o-mini (Achiam et al. 2023). These
results are achieved while Titans (MAC) is having much less number of parameters than baselines.
In the fine-tuning setup, we compare the small fine-tuned version of Titans (MAC) with: (i) the fine-tuned version of small
models (almost the same number of parameters as Titans) such as Mamba (Gu and Dao 2024), RMT (Bulatov, Yury Kuratov,
and Burtsev 2022), (ii) large models with Retrieval-Augmented Generation (RAG) (P. Lewis et al. 2020) such as Llama3.1-
8B (Touvron et al. 2023), and (iii) extremely large models such as GPT-4 (Achiam et al. 2023), GPT4o-mini, Qwen2.5-72B (A.
Yang et al. 2024), and Llama3.1-70B (Touvron et al. 2023). Baseline results are reported by (Yuri Kuratov et al. 2024). The
results of Titans and baselines are reported in Figure 6b. Titans outperform all models even extremely large models like
GPT4. Also, compared to Transformer-based with memory models like RMT, Titans show better performance mainly due
to their powerful memory. That is, RMT compress the historical data into 16 size vector-valued memory, while Titans with
in-context online memory learner are capable of encoding the past into the parameters of the model. Interestingly, even
14
(a) 170M Parameters (b) 360M Parameters (c) 760M Parameters
Figure 7: The effect of memory depth on the perplexity. Deeper long-term memory results in better scaling in longer
sequences.
Table 3: Performance on long-term forecasting. The best results are highlighted .
Neural Memory Simba iTransformer RLinear PatchTST Crossformer TiDE TimesNet DLinear
MSE MAE MSE MAE MSE MAE MSE MAE MSE MAE MSE MAE MSE MAE MSE MAE MSE MAE
ETTm1 0.358 0.387 0.383 0.396 0.407 0.410 0.414 0.407 0.387 0.400 0.513 0.496 0.419 0.419 0.400 0.406 0.403 0.407
ETTm2 0.261 0.309 0.271 0.327 0.288 0.332 0.286 0.327 0.281 0.326 0.757 0.610 0.358 0.404 0.291 0.333 0.350 0.401
ETTh1 0.420 0.421 0.441 0.432 0.454 0.447 0.446 0.434 0.469 0.454 0.529 0.522 0.541 0.507 0.458 0.450 0.456 0.452
ETTh2 0.336 0.382 0.361 0.391 0.383 0.407 0.374 0.398 0.387 0.407 0.942 0.684 0.611 0.550 0.414 0.427 0.559 0.515
ECL 0.162 0.261 0.169 0.274 0.178 0.270 0.219 0.298 0.205 0.290 0.244 0.334 0.251 0.344 0.192 0.295 0.212 0.300
Traffic 0.415 0.289 0.493 0.291 0.428 0.282 0.626 0.378 0.481 0.304 0.550 0.304 0.760 0.473 0.620 0.336 0.625 0.383
Weather 0.231 0.265 0.255 0.280 0.258 0.278 0.272 0.291 0.259 0.281 0.259 0.315 0.271 0.320 0.259 0.287 0.265 0.317
augmenting Llama3.1-8B model with RAG performs worse than Titans with about ×70 less parameters.
5.5 The Effect of Deep Memory
In this section, we evaluate the effect of deep memory in both wall-clock training time and model performance2. To this
end, we focus on different variants of our neural memory module, where 𝐿M = 1, 2, 3, 4. We also use Mamba as a baseline
for the model performance. For a fair comparison, we use the same training process for all models and train them on a
subset of the Pile dataset (L. Gao et al. 2020).
We report the perplexity of our models and baselines as the function of the sequence length in Figure 7. Interestingly, with
the increase of memory depth, 𝐿M , the model can achieve better perplexity over all sequence length. Also, deeper memory
modules are more robust to the sequence length when the model has less number of parameters. With the increase of the
number of parameters, all models show better performance on longer sequences.
Figure 8: The effect of memory depth on
training throughput
We also evaluate the effect of memory depth (𝐿M = 1, 2, 3, 4) on the training
throughput. We report the training throughput (the number of tokens per
second) as the function of sequence length in Figure 8. All models scale linearly
with respect to the context length (i.e., constant trend in the number of tokens
per second with respect to sequence length). Also, by increasing the memory
depth, as expected, we can see a linear trend that a deeper memory results in
a slower training. Therefore, it is not always efficient to use deeper memory
modules, showing a trade-off between effectiveness and efficiency.
5.6 Time Series Forecasting
To show the effectiveness of our memory module in a broader tasks, we also evaluate its performance in time series
forecasting tasks. To this end, we use Simba framework (Patro and Agneeswaran 2024) for time series forecasting, and
2Note that, in this experiment, we only focus on the neural memory module to evaluate the effect of memory depth in the memorization process.
Combining neural memory with attention as we do in Titans variants, can additionally enhance the performance of the model over long sequences.
15
Table 4: Downstream evaluation of pre-trained DNA models on GenomicsBenchmarks (Grešová et al. 2023). We report
top-1 classification accuracy (%).
Model Enhancer Cohn Enhancer Ens Human Reg. Non-TATA Promoters Human OCR Ens.
CNN 69.5 68.9 93.3 84.6 68.0
DNABERT 74.0 85.7 88.1 85.6 75.1
GPT 70.5 83.5 91.5 87.7 73.0
HyenaDNA 74.2 89.2 93.8 96.6 80.9
Transformer++ 73.4 89.5 89.9 94.4 79.5
Mamba 73.0 - - 96.6 -
Based 74.6 89.5 89.5 96.8 79.0
Neural Memory Module 75.2 89.6 89.3 96.6 79.9
replace its Mamba module with our neural memory. We report the results on common time series forecasting benchmark
datasets–ETT, ECL, Traffic, and Weather (H. Zhou et al. 2021). The results are reported in Table 3. Our neural memory
module is outperforming all baselines, including Mamba-based, linear-based, and Transformer-based architectures.
5.7 DNA Modeling
In order to understand the capability of Titans beyond natural language, we further evaluate the performance of our
neural memory module on DNA modeling tasks. To this end, we evaluate pre-trained models on the downstream tasks
in GenomicsBenchmarks (Grešová et al. 2023). We follow the same experimental setups from Nguyen et al. (2024), and
re-use the reported results of baselines by Arora et al. (2024). The performance of Titans (LMM) and baselines are reported
in Table 4. We find that LMM is competitive with state-of-the-art architectures across different downstream genomics
tasks.
5.8 Efficiency
Figure 9: Training throughput compari-
son of Titans and baselines.
In this part, we compare the efficiency of our neural memory as well as Titans
with state-of-the-art sequence models. The training throughput of models for
different sequence length × batch size are reported in Figure 9. Comparing
recurrent models, including our neural memory module, we can see our memory
module is slightly slower than Mamba2 and Gated DeltaNet, mainly due to: (1)
having deep memory and more expressive transition process (memory update),
and (2) highly optimized kernel in the implementation of Mamba2. Interestingly,
Titans (MAL) are faster than baselines as well as the memory module. The
main reason for this better throughput is the highly optimized kernel of Flash-
Attention (Dao 2024), which is used for implementing SWA and full attention
module in Titans.
5.9 Ablation Study
Finally, we perform ablation studies on the different architectural choices in Titans. We consider our neural memory
module as a base model and then changing one component at a time: (1) replacing deep memory with linear memory,
removing (2) convolution, (3) momentum in the surprise measure, (4) weight decay (or forgot mechanism), and (5) persistent
memory. The results are reported in Table 5. All components of neural memory design are positively contributing to its
performance, where the greatest contribution comes from weight decay, momentum, convolution, and persistent memory,
respectively.
The Effect of Architectural Design. To evaluate the effect of architecture design, we compare the performance of three
represented variants of Titans in three aspects of (i) language modeling, (ii) commen-sense reasoning, and (iii) long context
NIAH (BABILong) tasks. The results are reported in Table 5. We find that MAC and MAG have close performance in
language modeling and common-sense reasoning tasks, while MAC achieve significantly better performance in long-context
NIAH. Both of these models achieve better performance than MAL. These results along with Figure 9, show a trade-off
between fast training and more expressive design.
16
Table 5: Ablation Study on Titans. All components of Titans are positively contributing to its performance.
Model Language Modeling Reasoning Long Context
ppl ↓ acc ↑ acc ↑
LMM 27.01 47.83 92.68
+Attn (MAC) 26.67 48.65 97.95
+Attn (MAG) 25.70 48.60 96.70
+Attn (MAL) 25.91 47.87 96.91
Linear Memory 28.49 46.97 85.34
w/o Convolution 28.73 45.82 90.28
w/o Momentum 28.98 45.49 87.12
w/o Weight Decay 29.04 45.11 85.60
w/o Persistent Memory 27.63 46.35 92.49
6 Conclusion
In this paper, we present a neural long-term memory that, as a meta in-context learner, learns to memorize at test time.
The neural memory module is a recurrent model in nature, and is adaptively memorizing tokens that are more surprising
or are close to surprising tokens. Comparing to modern recurrent models, it has more expressive memory update and
storing mechanism. Using this memory, we present Titans architectures, and its three variants, in which we suggest to
incorporate the memory module as (1) a context, (2) gating, and (3) a layer. Our experimental evaluation on diverse tasks
tasks validate that Titans are more effective than Transformers and recent modern linear recurrent models, specifically for
long context. That is, Titans can scale to larger than 2M context window size with better accuracy than baselines.
Titans are implemented in Pytorch and JAX and we intend to make the code we used to train and evaluate our models
available soon.