#!/usr/bin/env python3
"""Build index-standalone.html from src/App.jsx. Run from the kit root:
   python3 tools/build_standalone.py
Exists because hand-regenerating this once injected literal backslash-n into the
script body (blank page). This script is the only supported way to rebuild."""
import io, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
jsx = io.open(os.path.join(root, "src", "App.jsx"), encoding="utf-8").read()
jsx = jsx.replace('import { useState, useRef } from "react";', "const { useState, useRef } = React;")
jsx = jsx.replace("export default function CardTable()", "function CardTable()")
jsx += "\nReactDOM.createRoot(document.getElementById(\"root\")).render(React.createElement(CardTable));\n"
assert "\\n" not in jsx.replace("\\\\n", ""), "literal backslash-n would break the page"
html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Card Table — a quantum game with no quantum in it</title>
<style>html,body,#root{margin:0;padding:0}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
""" + jsx + """
</script>
</body>
</html>
"""
out = os.path.join(root, "index-standalone.html")
io.open(out, "w", encoding="utf-8").write(html)
print("wrote", out, len(html), "bytes")
