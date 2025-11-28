import { expect, test } from "vitest";
import fs from "fs";
import path from "path";

import { FlexTeXtConvert } from "../src/main";

const mixedDemo = fs.readFileSync(path.join(__dirname, "./mixed-demo.txt"), "utf-8");


// Three examples of how we can use tests in Vitest.
test("demo", () => {
    const converted = FlexTeXtConvert(mixedDemo);
    expect(converted).toMatchSnapshot();
});

test("markdown markup", () => {
    const source = "A _term_ is not to be confused with an *emphasized* word or **alert**."
    const converted = FlexTeXtConvert(source);
    expect(converted).toMatchSnapshot();
});

// Here is an example of a test with input and output explicitly given.  The toMatchSnapshot() is probably better for most tests.
test("math markup", () => {
    const input = "The equation $E=mc^2$ is famous.";
    const output = "\n<p>\nThe equation <m>E = mc^{2}</m> is famous.\n</p>\n";
    expect(FlexTeXtConvert(input)).toBe(output);
});


// Additional tests.
const purePretext = fs.readFileSync(path.join(__dirname, "./pure-pretext.ptx"), "utf-8");
test("pure pretext", () => {
    const converted = FlexTeXtConvert(purePretext);
    console.log(converted);
    expect(converted).toMatchSnapshot();
});

// Self-closing tags work as expected.
test("self-closing tags", () => {
    const input = "This is a <pretext  /> tag";
    const output = "\n<p>\nThis is a <pretext/> tag\n</p>\n";
    expect(FlexTeXtConvert(input)).toBe(output);
});
