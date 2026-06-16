import subprocess

# Run git log -p to search all diffs for "calendar"
try:
    log_output = subprocess.check_output(
        ["git", "log", "-p", "-S", "calendar_provider"],
        cwd="c:\\Sher_AI_Studio\projects\\PayBio",
        encoding="utf-8",
        errors="ignore"
    )
    with open("scratch/calendar_provider_diffs.txt", "w", encoding="utf-8") as f:
        f.write(log_output)
    print("Done")
except Exception as e:
    print("Error:", e)
