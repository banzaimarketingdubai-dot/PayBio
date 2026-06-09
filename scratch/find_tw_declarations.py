import os
import re

filepath = r"c:\Sher_AI_Studio\projects\PayBio\.next\static\chunks\122-lxqewu_t1.js"

if os.path.exists(filepath):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    matches = [m.start() for m in re.finditer(r"\btW\b", content)]
    with open("scratch/tW_declarations.txt", "w", encoding="utf-8") as out:
        out.write(f"Total occurrences of 'tW' (case-sensitive): {len(matches)}\n")
        
        for idx, pos in enumerate(matches):
            start = max(0, pos - 150)
            end = min(len(content), pos + 150)
            snippet = content[start:end].replace("\n", " ")
            out.write(f"Match {idx+1} (at {pos}): ... {snippet} ...\n")
    print("Written to scratch/tW_declarations.txt")
else:
    print("File not found!")
