#!/usr/bin/env python3
"""
Validação Canônica em VM QEMU/VirtualBox:
1. Desinstalação destrutiva real de pacotes (14 recursos removíveis).
2. Teste de mutação real de DNS local vs nuvem no AdBlock com resolução ativa.

Este script executa a bateria canônica via harness na VM QEMU em /tmp/qemu_serial.sock.
"""

import json
import os
import re
import socket
import sys
import time
import unittest

SOCKET_PATH = "/tmp/qemu_serial.sock"
HTTP_PORT = 8089
HTTP_HOST = "192.168.1.2"


class VMSession:
    def __init__(self, sock_path=SOCKET_PATH):
        self.sock_path = sock_path

    def run_script(self, script_path, timeout=60):
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.connect(self.sock_path)
        s.settimeout(timeout)

        # Flush buffer
        try:
            while True:
                s.settimeout(0.2)
                d = s.recv(4096)
                if not d:
                    break
        except Exception:
            pass

        cmd = (
            f"wget -q -O /tmp/test_runner.sh http://{HTTP_HOST}:{HTTP_PORT}/{os.path.basename(script_path)} && "
            f"sh /tmp/test_runner.sh; echo __FIN\"\"ISHED_VM_TESTS__:$?:\n"
        )
        s.sendall(cmd.encode())

        buf = ""
        start = time.time()
        s.settimeout(1.0)
        pattern = re.compile(r"(?<!echo )__FINISHED_VM_TESTS__:(\d+):")

        while time.time() - start < timeout:
            try:
                chunk = s.recv(4096).decode("utf-8", errors="replace")
                buf += chunk
                m = pattern.search(buf)
                if m:
                    rc = int(m.group(1))
                    s.close()
                    return rc, buf
            except socket.timeout:
                continue

        s.close()
        raise TimeoutError(f"Script {script_path} timed out after {timeout}s:\n{buf}")


class TestVMMatrixValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vm = VMSession()

    def test_run_full_vm_battery(self):
        """Executa toda a matriz de desinstalação destrutiva e mutação de DNS na VM."""
        script_file = "/tmp/run_vm_all_tests.sh"
        self.assertTrue(os.path.exists(script_file), f"Script {script_file} não encontrado")

        rc, output = self.vm.run_script(script_file, timeout=90)
        self.assertEqual(rc, 0, f"Falhas detectadas na bateria da VM (rc={rc}):\n{output}")
        self.assertIn("SUCESSO ABSOLUTO: 100% DAS VALIDAÇÕES EM VM APROVADAS!", output)
        self.assertIn("Total de Testes Executados: 226", output)
        self.assertIn("Falhas: 0", output)


if __name__ == "__main__":
    unittest.main(verbosity=2)
