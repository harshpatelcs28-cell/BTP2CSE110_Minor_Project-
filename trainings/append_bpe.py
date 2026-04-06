import json
import uuid

# Load notebook
file_path = r'd:\Minor project (ML)\trainings\untitled.ipynb'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        nb = json.load(f)
except Exception as e:
    print(f'Error loading notebook: {e}')
    exit(1)

# BPE Cell Source Code
bpe_source = [
    "# Cell 3: Byte Pair Encoding (BPE) setup for Text Encoding\n",
    "# BPE is primarily an NLP technique used to sub-word tokenize and encode text.\n",
    "# We can apply this to textual categories in our dataset (like 'crop_type') to encode them as tokens.\n",
    "\n",
    "import collections\n",
    "import re\n",
    "\n",
    "def get_stats(vocab):\n",
    "    \"\"\"Counts the frequency of adjacent character/subword pairs in the vocabulary.\"\"\"\n",
    "    pairs = collections.defaultdict(int)\n",
    "    for word, freq in vocab.items():\n",
    "        symbols = word.split()\n",
    "        for i in range(len(symbols)-1):\n",
    "            pairs[symbols[i], symbols[i+1]] += freq\n",
    "    return pairs\n",
    "\n",
    "def merge_vocab(pair, v_in):\n",
    "    \"\"\"Merges the most frequent contiguous pair in all vocabulary words.\"\"\"\n",
    "    v_out = {}\n",
    "    bigram = re.escape(' '.join(pair))\n",
    "    p = re.compile(r'(?<!\S)' + bigram + r'(?!\S)')\n",
    "    for word in v_in:\n",
    "        w_out = p.sub(''.join(pair), word)\n",
    "        v_out[w_out] = v_in[word]\n",
    "    return v_out\n",
    "\n",
    "# Example: Let's extract unique text terms from our dataset to encode them via BPE\n",
    "try:\n",
    "    # Attempting to use the data from Cell 2\n",
    "    sample_texts = df['crop_type'].dropna().unique().tolist() if 'crop_type' in df.columns else [\"wheat crop\", \"rice crop\", \"banana\", \"wheat rust\"]\n",
    "except:\n",
    "    sample_texts = [\"wheat crop\", \"rice crop\", \"banana\", \"wheat heat\"]\n",
    "    \n",
    "# 1. Initialize BPE vocabulary tracking characters separated by spaces + an end-of-word marker\n",
    "vocab = collections.defaultdict(int)\n",
    "for text in sample_texts:\n",
    "    # Splitting into words for basic text processing\n",
    "    words = text.lower().split()\n",
    "    for word in words:\n",
    "        vocab[\" \".join(list(word)) + \" </w>\"] += 1\n",
    "\n",
    "print(\"Initial BPE Vocab Dictionary:\", dict(vocab))\n",
    "\n",
    "# 2. Iterate and Merge (BPE algorithm)\n",
    "num_merges = 10\n",
    "print(f\"\\n--- Running BPE for {num_merges} iterative merges ---\")\n",
    "for i in range(num_merges):\n",
    "    pairs = get_stats(vocab)\n",
    "    if not pairs:\n",
    "        break\n",
    "    best = max(pairs, key=pairs.get)\n",
    "    vocab = merge_vocab(best, vocab)\n",
    "    print(f\"Merge #{i+1}: {best} -> '{best[0]}{best[1]}'\")\n",
    "\n",
    "print(\"\\nFinal Subword Vocab Tokens:\")\n",
    "for k, v in vocab.items():\n",
    "    print(f\"Token: '{k}' -> Frequency: {v}\")\n"
]

new_cell = {
    "cell_type": "code",
    "execution_count": None,
    "id": str(uuid.uuid4()),
    "metadata": {},
    "outputs": [],
    "source": bpe_source
}

nb['cells'].append(new_cell)

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)

print('Successfully appended BPE cell!')
