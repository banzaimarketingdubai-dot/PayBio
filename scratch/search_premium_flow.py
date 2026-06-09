import subprocess

def get_file_content(ref, filepath):
    return subprocess.check_output(['git', 'show', f'{ref}:{filepath}'], text=True, encoding='utf-8')

content = get_file_content('d1c1ca4', 'src/app/page.tsx')
lines = content.splitlines()

with open('scratch/search_premium_flow_out.txt', 'w', encoding='utf-8') as out:
    # Search for renderOverlays and PremiumFlow and print surrounding lines
    for i, line in enumerate(lines):
        if 'renderOverlays = ' in line:
            out.write(f"--- renderOverlays starts at line {i+1} ---\n")
            for idx in range(max(0, i - 5), min(len(lines), i + 30)):
                out.write(f"{idx+1}: {lines[idx]}\n")
        if '<PremiumFlow' in line:
            out.write(f"--- PremiumFlow found at line {i+1} ---\n")
            for idx in range(max(0, i - 10), min(len(lines), i + 25)):
                out.write(f"{idx+1}: {lines[idx]}\n")
                
print("Output written to scratch/search_premium_flow_out.txt")
