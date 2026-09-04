# Verify Router Health Command

Use this command to check router resources, memory budget, and daemon status.

## Prompt
Verify that changes maintain the target hardware budget:
1. Check free memory: Must maintain > 80 MB free RAM on D-Link DGL-5500 (128 MB total).
2. Check flash storage: Free overlay > 3 MB.
3. Check daemon CPU: No single background process consuming > 5% sustained CPU.
4. Verify UCI integrity: Ensure all `/etc/config` changes are committed and valid.
