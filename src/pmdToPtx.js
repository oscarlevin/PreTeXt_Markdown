import { fmToPTX } from "./parse";
import { onlyWhiteSpace, sanitizeMathXml } from "./helpers.js";
import { fromXml } from "xast-util-from-xml";
import { toXml } from "xast-util-to-xml";
import { CONTINUE, SKIP, visit } from "unist-util-visit";


const inlineTags = ['em', 'alert', 'term', 'c', 'm', 'pretext', 'latex', 'tex', 'me', 'md', 'men', 'mdn', 'xref', 'fn',];
const avoidPTags = ['p', 'caption', 'title', 'subtitle', 'idx', 'h'];

export function pmdToPtx(pmdText) {
    // Remove the xml declaration if present
    pmdText = pmdText.replace(/<\?xml.*?\?>\s*/g, '');

    // Fix '<' and '&' in math.
    pmdText = sanitizeMathXml(pmdText);

    console.log("Sanitized PMD text:", pmdText);
    // Create a xast tree from the PMD text, wrapped in a root node.
    // The 'root' node is necessary in case the PMD text has multiple top-level nodes.
    let tree = fromXml(`<root>${pmdText}</root>`);

    console.log("Initial tree:", tree);

    // Traverse the tree and convert text nodes containing latex or markdown to PreTeXt
    visit(tree, (node, index, parent) => {
        // If node is text and contains non-whitespace characters, convert if necessary.  Then place converted as xml into tree and skip further processing of children.
        // Note: we assume that the text node already contains all inline pretext markup, since the parent will have merged all of these.
        if (node.type === "text" && !onlyWhiteSpace(node.value)) {
            console.log("Processing text node:", node.value);
            const convertedText = fmToPTX(node.value);
            console.log("Converted text:", convertedText);

            // If parent is a tag that contains text NOT in a <p> tag, strip current <p> tags.
            let finalConvertedText = convertedText;
            if (parent && parent.type === "element" && avoidPTags.includes(parent.name)) {
                finalConvertedText = convertedText.replace(/<p>\s*/g, '').replace(/\s*<\/p>/g, '');
                console.log("Stripped <p> tags for parent <p>:", convertedText, finalConvertedText);
            }

            // insert converted xml text as raw xml nodes
            let convertedTree = fromXml(`<root>${finalConvertedText}</root>`);

            parent.children.splice(index, 1, ...convertedTree.children);
            console.log("Parent after insertion:", JSON.stringify(parent, null, 2));
            return SKIP;
        }


        // If children contain any node of type text, merge inline tags as text with their neighbors.  At the next level of the tree, these will be processed as text nodes.  This allows us to preserve the original inline markup.
        if (node.children && node.children.some(child => child.type === "text" && !onlyWhiteSpace(child.value))) {
            console.log("Node with text children found:", JSON.stringify(node, null, 2));
            // Transform inline tags back into text nodes
            node.children = node.children.reduce((acc, child) => {
                if (child.type === "element" && (inlineTags.includes(child.name))) {
                    let content = toXml(child, { closeEmptyElements: true });
                    console.log("Reassembled content for", child.name, ":", content);
                    // Merge with previous text node if possible
                    if (acc.length > 0 && acc[acc.length - 1].type === "text") {
                        acc[acc.length - 1].value += content;
                    } else {
                        acc.push({ type: "text", value: content });
                    }
                } else if (child.type === "text") {
                    // Merge consecutive text nodes
                    if (acc.length > 0 && acc[acc.length - 1].type === "text") {
                        acc[acc.length - 1].value += child.value;
                    } else {
                        acc.push(child);
                    }
                } else {
                    acc.push(child);
                }
                return acc;
            }, []);
            console.log("Transformed children:", JSON.stringify(node.children, null, 2));
        }
    });

    //let ptxText = fmToPTX(tree);
    let ptxText = toXml(tree, { closeEmptyElements: true });
    console.log("Final PTX text:", ptxText);
    ptxText = ptxText.replace(/<root>/g, '').replace(/<\/root>/g, '');
    console.log("PTX text after removing root:", ptxText);
    return ptxText;
}

// Utility to show tree as JSON on test page.
export function pmdToXast(pmdText) {
    // Remove the xml declaration if present
    pmdText = pmdText.replace(/<\?xml.*?\?>\s*/g, '');
    pmdText = sanitizeMathXml(pmdText);

    let tree = fromXml(`<root>${pmdText}</root>`);
    return JSON.stringify(tree, null, 2);
}

