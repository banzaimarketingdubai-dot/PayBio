with open('scratch/stripped_diff.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_hunk = []
hunks = []

for line in lines:
    if line.startswith('@@'):
        if current_hunk:
            hunks.append(current_hunk)
            current_hunk = []
        current_hunk.append(line)
    elif current_hunk:
        current_hunk.append(line)

if current_hunk:
    hunks.append(current_hunk)

with open('scratch/hunks_summary.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total changed hunks: {len(hunks)}\n")

    for i, hunk in enumerate(hunks):
        header = hunk[0].strip()
        added_lines = [l.strip() for l in hunk if l.startswith('+') and not l.startswith('+++')]
        removed_lines = [l.strip() for l in hunk if l.startswith('-') and not l.startswith('---')]
        
        out.write(f"\n--- HUNK {i+1}: {header} ---\n")
        out.write(f"Added {len(added_lines)} lines, Removed {len(removed_lines)} lines.\n")
        if added_lines:
            out.write("First few added lines:\n")
            for l in added_lines[:15]:  # print up to 15 lines for more context
                out.write(f"  {l}\n")
        if removed_lines:
            out.write("First few removed lines:\n")
            for l in removed_lines[:15]:
                out.write(f"  {l}\n")

print("Hunks summary written to scratch/hunks_summary.txt")
