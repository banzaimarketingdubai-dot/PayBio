import os

filepath = r"c:\Sher_AI_Studio\projects\PayBio\.next\static\chunks\122-lxqewu_t1.js"

if os.path.exists(filepath):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    lines = content.splitlines()
    with open("scratch/error_context.txt", "w", encoding="utf-8") as out:
        out.write(f"Total lines in file: {len(lines)}\n")
        if len(lines) >= 5:
            line5 = lines[4]
            out.write(f"Line 5 length: {len(line5)}\n")
            pos = 12938
            start = max(0, pos - 250)
            end = min(len(line5), pos + 250)
            out.write("--- Context around position 12938 in line 5 ---\n")
            out.write(line5[start:end] + "\n")
        else:
            out.write("Line 5 doesn't exist!\n")
    print("Written to scratch/error_context.txt")
else:
    print("File not found!")
