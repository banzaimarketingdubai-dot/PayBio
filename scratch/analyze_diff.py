import subprocess
import difflib

def get_file_content(ref, filepath):
    return subprocess.check_output(['git', 'show', f'{ref}:{filepath}'], text=True, encoding='utf-8')

content_b = get_file_content('b4ba79f', 'src/app/page.tsx')
content_d = get_file_content('d1c1ca4', 'src/app/page.tsx')

lines_b = [line.strip() for line in content_b.splitlines()]
lines_d = [line.strip() for line in content_d.splitlines()]

diff = list(difflib.unified_diff(lines_b, lines_d, fromfile='b4ba79f', tofile='d1c1ca4', n=1))

with open('scratch/stripped_diff.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total diff lines (stripped): {len(diff)}\n")
    for line in diff:
        f.write(line + '\n')

print("Diff analysis written to scratch/stripped_diff.txt")
