#!/usr/bin/env python3
"""Tail a k6 --out json stream and print periodic HTTP request health status.

Reads k6's own emitted metric points (http_reqs, http_req_failed) rather than
maintaining a separate counting mechanism, so counts always match k6's totals.
"""
import argparse
import json
import os
import time


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("ndjson_path")
    parser.add_argument("--interval", type=float, default=3.0)
    parser.add_argument("--label", default="")
    args = parser.parse_args()

    total_requests = 0
    failed_requests = 0
    last_report_time = time.time()
    last_report_total = 0

    while not os.path.exists(args.ndjson_path):
        time.sleep(0.2)

    with open(args.ndjson_path, "r") as handle:
        while True:
            line = handle.readline()
            if not line:
                now = time.time()
                elapsed = now - last_report_time
                if elapsed >= args.interval and total_requests > 0:
                    delta = total_requests - last_report_total
                    current_rps = delta / elapsed if elapsed > 0 else 0.0
                    success = total_requests - failed_requests
                    success_pct = (success / total_requests * 100) if total_requests else 0.0
                    prefix = f"{args.label} | " if args.label else ""
                    print(
                        f"{prefix}~{current_rps:.0f} RPS | {total_requests:,} requests | "
                        f"{success:,} success | {failed_requests:,} errors | "
                        f"{success_pct:.2f}% success",
                        flush=True,
                    )
                    last_report_time = now
                    last_report_total = total_requests
                time.sleep(0.1)
                continue

            line = line.strip()
            if not line:
                continue

            try:
                event = json.loads(line)
            except ValueError:
                continue

            metric = event.get("metric")
            if metric == "http_reqs":
                total_requests += 1
            elif metric == "http_req_failed":
                value = event.get("data", {}).get("value")
                if value:
                    failed_requests += 1


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
