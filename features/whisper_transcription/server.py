#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import whisper
import os

sys.stdin.reconfigure(encoding="utf-8", line_buffering=True)


def main():
    print("Loading Whisper model...", file=sys.stderr)
    model = whisper.load_model("large-v3", device="cpu")
    print("Model loaded", file=sys.stderr)

    for line in sys.stdin:
        audio_path = line.strip()
        print(f"Received audio path: {audio_path}", file=sys.stderr)

        if not audio_path:
            print("Empty audio path, skipping", file=sys.stderr)
            continue

        try:
            if not os.path.exists(audio_path):
                print(f"Error: File not found: {audio_path}", file=sys.stderr)
                print("", file=sys.stdout)
                continue

            print(f"File exists, starting transcription...", file=sys.stderr)
            print(f"File size: {os.path.getsize(audio_path)} bytes", file=sys.stderr)

            result = model.transcribe(
                audio_path,
                language="ja",
                task="transcribe",
                temperature=0.0,
                patience=1.0,
                beam_size=5,
                best_of=5,
                no_speech_threshold=0.6,
                compression_ratio_threshold=2.4,
                logprob_threshold=-1.0,
                fp16=False,
                condition_on_previous_text=True,
                initial_prompt="これは会話の文字起こしです。正確な日本語で出力してください。",
            )

            print("Transcription completed", file=sys.stderr)
            transcription = result["text"].strip()
            print(f"Transcription result: '{transcription}'", file=sys.stderr)
            print(transcription, file=sys.stdout)
            sys.stdout.flush()
            print("Output flushed", file=sys.stderr)

        except Exception as e:
            print(f"Error: {str(e)}", file=sys.stderr)
            import traceback

            traceback.print_exc(file=sys.stderr)
            print("", file=sys.stdout)
            sys.stdout.flush()


if __name__ == "__main__":
    main()
