#!/usr/bin/env python3
"""Tests for 100% offline continuous review (scripts/offline-review.sh & .githooks/)."""
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OFFLINE_REVIEW = REPO / "scripts" / "offline-review.sh"
PRE_COMMIT = REPO / ".githooks" / "pre-commit"
PRE_PUSH = REPO / ".githooks" / "pre-push"


class OfflineReviewTests(unittest.TestCase):
    def _make_sandbox_repo(self, tmp_dir):
        root = Path(tmp_dir)
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run(["git", "-C", str(root), "config", "user.name", "Test"], check=True)
        subprocess.run(["git", "-C", str(root), "config", "user.email", "test@local"], check=True)
        scripts_dir = root / "scripts"
        scripts_dir.mkdir(parents=True)
        dst_script = scripts_dir / "offline-review.sh"
        shutil.copyfile(OFFLINE_REVIEW, dst_script)
        dst_script.chmod(0o755)
        (root / "README.md").write_text("# Sandbox\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(root), "add", "README.md", "scripts/offline-review.sh"], check=True)
        subprocess.run(["git", "-C", str(root), "commit", "-q", "-m", "init"], check=True)
        return root, dst_script

    def _run_staged_review(self, root, script):
        return subprocess.run(
            ["sh", str(script), "--staged"],
            cwd=str(root),
            capture_output=True,
            text=True,
        )

    def test_shell_syntax_and_shellcheck_clean(self):
        for path in (OFFLINE_REVIEW, PRE_COMMIT, PRE_PUSH):
            self.assertTrue(path.is_file(), f"Missing {path}")
            subprocess.run(["sh", "-n", str(path)], check=True)
            if shutil.which("dash"):
                subprocess.run(["dash", "-n", str(path)], check=True)
            if shutil.which("shellcheck"):
                res = subprocess.run(["shellcheck", "-s", "sh", str(path)], capture_output=True, text=True)
                self.assertEqual(res.returncode, 0, f"shellcheck failed on {path}:\n{res.stdout}\n{res.stderr}")

    def test_clean_staged_change_passes(self):
        with tempfile.TemporaryDirectory(prefix="ark_offrev_ok_") as tmp:
            root, script = self._make_sandbox_repo(tmp)
            mod = root / "root" / "usr" / "lib" / "ark" / "modules" / "sample.sh"
            mod.parent.mkdir(parents=True)
            mod.write_text("#!/bin/sh\nsample_fn() {\n\tprintf 'ok\\n'\n}\n", encoding="utf-8")
            subprocess.run(["git", "-C", str(root), "add", str(mod)], check=True)
            res = self._run_staged_review(root, script)
            self.assertEqual(res.returncode, 0, f"Expected PASS, got:\n{res.stdout}\n{res.stderr}")

    def test_blocks_secrets_v2_prompt_tls_and_jool_regressions(self):
        cases = [
            (
                "secret",
                "root/usr/lib/ark/modules/bad_secret.sh",
                "#!/bin/sh\nKEY='AIzaSyA123456789012345678901234567890123'\n",
                "token/API secret",
            ),
            (
                "overview_v2",
                "root/www/luci-static/resources/view/equipe-dashboard/overview_v2.js",
                "console.log('stale');\n",
                "overview_v2",
            ),
            (
                "sync_prompt",
                "src/modules/bad_ui.js",
                "function copyIt(x) { prompt('copy', x); }\n",
                "prompt/alert/confirm",
            ),
            (
                "tls_bypass",
                "root/usr/lib/ark/modules/bad_tls.sh",
                "#!/bin/sh\nwget --no-check-certificate https://example.com\n",
                "Bypass TLS",
            ),
            (
                "jool_status_bug",
                "root/usr/lib/ark/modules/bad_jool.sh",
                "#!/bin/sh\njool -i ark_nat64 instance status >/dev/null 2>&1\n",
                "jool instance status",
            ),
            (
                "footer_dup",
                "root/usr/share/ucode/luci/template/themes/ark/footer.ut",
                "<script>function autoExpandActiveMenu() {}</script>\n",
                "Lógica JS duplicada no footer",
            ),
        ]
        for label, rel, content, expected_msg in cases:
            with self.subTest(case=label):
                with tempfile.TemporaryDirectory(prefix=f"ark_offrev_{label}_") as tmp:
                    root, script = self._make_sandbox_repo(tmp)
                    target = root / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text(content, encoding="utf-8")
                    subprocess.run(["git", "-C", str(root), "add", rel], check=True)
                    res = self._run_staged_review(root, script)
                    combined = res.stdout + "\n" + res.stderr
                    self.assertNotEqual(res.returncode, 0, f"{label} should have failed:\n{combined}")
                    self.assertIn(expected_msg, combined, f"Missing expected diagnostic for {label}:\n{combined}")

    def test_real_repo_range_review_passes(self):
        res = subprocess.run(
            ["sh", str(OFFLINE_REVIEW), "--range", "HEAD~1..HEAD"],
            cwd=str(REPO),
            capture_output=True,
            text=True,
        )
        self.assertEqual(res.returncode, 0, f"Offline range review failed:\n{res.stdout}\n{res.stderr}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
