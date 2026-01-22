#!/usr/bin/env python3
import argparse
import pathlib
import shutil
import subprocess
import sys
import tempfile


LOGO_DIR = pathlib.Path(__file__).resolve().parent / "mp3"
START_LOGO = LOGO_DIR / "mofa-vocal-logo-start.mp3"
END_LOGO = LOGO_DIR / "mofa-vocal-logo-end.mp3"


def _ffmpeg_concat_list(paths):
    lines = []
    for path in paths:
        escaped = str(path).replace("'", r"'\''")
        lines.append(f"file '{escaped}'")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Concatenate mofa vocal logos to the start/end of an input mp3."
        )
    )
    parser.add_argument("input_mp3", help="Input mp3 file")
    parser.add_argument(
        "-o",
        "--output",
        help="Output mp3 path (default: <input>_mofa.mp3)",
    )
    args = parser.parse_args()

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("ffmpeg not found in PATH.", file=sys.stderr)
        return 1

    input_path = pathlib.Path(args.input_mp3).expanduser().resolve()
    if not input_path.exists():
        print(f"Input mp3 not found: {input_path}", file=sys.stderr)
        return 1
    if not START_LOGO.exists():
        print(f"Start logo not found: {START_LOGO}", file=sys.stderr)
        return 1
    if not END_LOGO.exists():
        print(f"End logo not found: {END_LOGO}", file=sys.stderr)
        return 1

    if args.output:
        output_path = pathlib.Path(args.output).expanduser().resolve()
    else:
        output_path = input_path.with_name(f"{input_path.stem}_mofa.mp3")

    if output_path == input_path:
        print("Output path must be different from input path.", file=sys.stderr)
        return 1

    concat_list = _ffmpeg_concat_list([START_LOGO, input_path, END_LOGO])
    with tempfile.TemporaryDirectory() as temp_dir:
        list_path = pathlib.Path(temp_dir) / "concat.txt"
        list_path.write_text(concat_list, encoding="utf-8")
        command = [
            ffmpeg,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_path),
            "-c",
            "copy",
            str(output_path),
        ]
        try:
            subprocess.run(command, check=True)
        except subprocess.CalledProcessError as exc:
            print(f"ffmpeg failed with exit code {exc.returncode}.", file=sys.stderr)
            return exc.returncode

    print(f"Created: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
