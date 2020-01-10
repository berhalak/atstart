#!/usr/bin/env node
import { Generator } from "."
const args = process.argv.slice(2);
const gen = new Generator();
gen.write(process.cwd());