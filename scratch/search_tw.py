import os

chunks_dir = r"c:\Sher_AI_Studio\projects\PayBio\.next\static\chunks"

for filename in os.listdir(chunks_dir):
    if filename.endswith(".js"):
        filepath = os.path.join(chunks_dir, filename)
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            if "tw" in content:
                print(f"Found 'tw' in {filename}")
                # Print occurrences of 'tw' as a word
                import re
                matches = [m.start() for m in re.finditer(r"\btw\b", content)]
                if matches:
                    print(f"  Exact matches count: {len(matches)}")
                    for idx, pos in enumerate(matches[:5]):
                        start = max(0, pos - 50)
                        end = min(len(content), pos + 50)
                        snippet = content[start:end].replace("\n", " ")
                        print(f"    Match {idx+1}: ... {snippet} ...")
