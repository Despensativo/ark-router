#!/usr/bin/env python3
"""Analyze existing monitor text offline; never infer loss from empty fields.

Run from any directory with one or more explicit log paths. Endpoint names are
replaced with stable hashes in output. An endpoint is not a full conntrack tuple.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

SAMPLE = re.compile(r"^\[(\d+)/(\d+) (\d{2}:\d{2}:\d{2})\]")
VOICE = re.compile(r"(UL|DL)_Voice\(pk=(\d+)us,av=(\d+)us,drop=(\d*)\)")
ENDPOINT = re.compile(r"([\d.]+:\d+)\(tx=(\d+),rx=(\d+),mark=(\d+)\)")


def analyze_text(content):
    rows = []
    for line in content.splitlines():
        match = SAMPLE.match(line)
        if not match:
            continue
        voices = {
            direction: {
                "pk_us": int(peak),
                "av_us": int(average),
                "drops": int(drops) if drops else None,
            }
            for direction, peak, average, drops in VOICE.findall(line)
        }
        endpoints = {}
        for endpoint, tx, rx, mark in ENDPOINT.findall(line):
            alias = hashlib.sha256(endpoint.encode()).hexdigest()[:12]
            endpoints.setdefault(alias, []).append(
                {"tx": int(tx), "rx": int(rx), "mark": int(mark)}
            )
        rows.append({"sample": int(match[1]), "expected": int(match[2]),
                     "time": match[3], "voices": voices,
                     "endpoints": endpoints})

    summaries = {}
    for alias in sorted({key for row in rows for key in row["endpoints"]}):
        observations = []
        ambiguous_samples = 0
        for row in rows:
            values = row["endpoints"].get(alias, [])
            if not values:
                continue
            ambiguous_samples += int(len(values) > 1)
            # Summarize the largest observed counter pair, not a proven flow.
            largest = max(values, key=lambda value: value["tx"] + value["rx"])
            observations.append({"sample": row["sample"], "time": row["time"], **largest})
        decreases = []
        for before, after in zip(observations, observations[1:]):
            if after["tx"] < before["tx"] or after["rx"] < before["rx"]:
                decreases.append({"before": before, "after": after})
        summaries[alias] = {
            "observed_samples": len(observations),
            "absent_samples_not_loss": len(rows) - len(observations),
            "ambiguous_samples": ambiguous_samples,
            "largest_first": observations[0], "largest_last": observations[-1],
            "counter_decrease_candidates_not_disconnects": decreases,
        }

    return {
        "samples": len(rows),
        "first_time": rows[0]["time"] if rows else None,
        "last_time": rows[-1]["time"] if rows else None,
        "sample_sequence": [row["sample"] for row in rows],
        "queue_fields": {
            direction: {
                "observed_samples": sum(direction in row["voices"] for row in rows),
                "missing_drop_values": sum(
                    row["voices"][direction]["drops"] is None
                    for row in rows if direction in row["voices"]),
                "av_us_values": sorted({row["voices"][direction]["av_us"]
                                        for row in rows if direction in row["voices"]}),
            } for direction in ["UL", "DL"]
        },
        "marks_observed_not_proof_of_tin": sorted({value["mark"] for row in rows
            for values in row["endpoints"].values() for value in values}),
        "lan_no_reply_labels_not_loss": content.count("LAN:sem_resposta"),
        "icmp_block_labels_not_proof_of_block": content.count("icmp_bloq"),
        "endpoints_not_full_flow_ids": summaries,
        "limitations": ["No in-game ping series", "No byte rate series",
                        "No packet sequence numbers", "No full conntrack tuple",
                        "No synchronized LAN/WAN capture", "No causal attribution"],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("logs", nargs="+", type=Path)
    arguments = parser.parse_args()
    results = []
    for path in arguments.logs:
        raw = path.read_bytes()
        results.append({"file": path.name, "sha256": hashlib.sha256(raw).hexdigest(),
                        **analyze_text(raw.decode("utf-8"))})
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
