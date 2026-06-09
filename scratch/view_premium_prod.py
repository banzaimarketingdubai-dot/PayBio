import subprocess

def get_file_content(ref, filepath):
    return subprocess.check_output(['git', 'show', f'{ref}:{filepath}'], text=True, encoding='utf-8')

content = get_file_content('d1c1ca4', 'src/app/page.tsx')
lines = content.splitlines()

with open('scratch/premium_prod_context.txt', 'w', encoding='utf-8') as out:
    for idx in range(2415, 2455):
        if idx < len(lines):
            out.write(f"{idx+1}: {lines[idx]}\n")

print("Written to scratch/premium_prod_context.txt")
