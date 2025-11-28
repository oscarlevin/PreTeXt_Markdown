
// The main input to the conversion is:
//    c1. List of tags in categories, for both LaTeX and PreTeXt.
//    c2. Mappings from LaTeX to PreTeXt tags.
//    c3. How to search for each tag in each category.
//    c4. How to output the parsed PreTeXt content.

// Output tags. Will repeatedly add to these

export const do_nothing_markup = {begin_tag: "", end_tag: "",  // not sure we need the 'export'
         before_begin: "", after_begin: "",
         before_end: "", after_end: ""}; 

export const debugging_output_markup = {begin_tag: "BEGINTAG", end_tag: "ENDTAG",
         before_begin: "BB", after_begin: "AB",
         before_end: "BE", after_end: "AE"};

export const outputtags = {  // start with the quirky ones
    "text" : do_nothing_markup,
    "placeholder" : do_nothing_markup,
    };

export const PTXblockoutput = function(tag) {
    return  { begin_tag: "<" + tag + "",
                       end_tag: "</" + tag + ">",
        before_begin: "\n", after_begin: ">\n",
        before_end: "\n", after_end: "\n"}
}
export const PTXcontaineroutput = function(tag) {  // eg, "theorem"
    return  { begin_tag: "<" + tag + "",
                       end_tag: "</" + tag + ">",
        before_begin: "\n", after_begin: ">",
        before_end: "", after_end: "\n"}
}
export const PTXtitleoutput = function(tag) {
    return  { begin_tag: "<" + tag + ">",
                       end_tag: "</" + tag + ">",
        before_begin: "\n", after_begin: "",
        before_end: "", after_end: "\n"}
}
export const PTXinlineoutput = function(tag) {
    return  { begin_tag: "<" + tag + "",
                       end_tag: "</" + tag + ">",
        before_begin: "", after_begin: ">",
        before_end: "", after_end: ""}
}


// Parsing (called "delimiters")

const PreTeXtDelimiterOf = function(delim) {
    return {left:"<" + delim + ">", right:"</" + delim + ">", tag:delim}
}
export const PreTeXtDelimiterOfAttributes = function(delim) {
    return {left:"<" + delim + " ", right:"</" + delim + ">", tag:delim}
}
const LaTeXDelimiterOf = function(delim) {
    return {left:"\\begin{" + delim + "}", right:"\\end{" + delim + "}", tag:delim}
}
export const delimitersFromList = function(lis) {
    if (!Array.isArray(lis)) { return lis }
    let delim_lis = [];
    lis.forEach( (el) => {
        delim_lis.push( PreTeXtDelimiterOfAttributes(el) );
        delim_lis.push( PreTeXtDelimiterOf(el) );
        delim_lis.push( LaTeXDelimiterOf(el) );
    });
    return delim_lis
}



//////////////////
//
//  math
//
//////////////////

const remapped_math_tags = [  // [latex_name, ptx_tag]
                         // could these be handled by an alias, like we did with quote -> blockquote?
    ["equation", "men"],
    ["equationstar", "me"],  // preprocesssor does {abcd*} -> {abcdstar}
    ["align", "mdn"],
    ["alignstar", "md"],
];

export const display_math_delimiters = [
          {left:"$$", right:"$$", tag:"me"},
//          {left:"\\[", right:"\\]", tag:"me"},   // preprocessor handles these; don't work: not sure why
];
remapped_math_tags.forEach( (el) => {
    display_math_delimiters.push(
        {left:"\\begin{" + el[0] + "}", right:"\\end{" + el[0] + "}", tag:el[1]}
    );
});

display_math_delimiters.push(
    {left:"\\begin{" + "sage" + "}", right:"\\end{" + "sage" + "}", tag:"sage"}
);

display_math_delimiters.push({left: "<md>", right: "</md>", tag: "md"});
display_math_delimiters.push({left: "<md ", right: "</md>", tag: "md"});
display_math_delimiters.push({left: "<me>", right: "</me>", tag: "me"});
display_math_delimiters.push({left: "<me ", right: "</me>", tag: "me"});
display_math_delimiters.push({left: "<mdn", right: "</mdn>", tag: "mdn"});
display_math_delimiters.push({left: "<men", right: "</men>", tag: "men"});

export const display_math_tags = ["md", "mdn", "me", "men"];  // some day, let's get rid of me and men

display_math_tags.forEach( (el) => { 
    outputtags[el] = {begin_tag: "\n<" + el, end_tag: "</" + el + ">",
         before_begin: "", after_begin: ">\n", // because probably source has the \n
         before_end: "\n", after_end: "\n"};
});

export const math_tags = ["m", ...display_math_tags];



// this list is not used, it serves to help keep track of tags requiring special attention
export const randomtags = ["fn", 
              "output",
              ];

export const randomtags_containing_p = ["reading-questions", "introduction", "conclusion", "objectives", "statement", "task", "worksheet","page", "abstract"];
                      // exercisegroup should be in a different category

//  const containers = ["exercisegroup", "exercises", "prefigure", "diagram", ...subenvironments["diagram"] ];  // only contain tags, not p

// LaTeX, TeX, PreTeXt, [[what else?]]

export const list_like = ["ol", "ul", "dl"]; 
const other_pure_containers = ["code","mrow", "biblio", "comment"];  // currently unused
export const list_elements = ["li"];

export const aside_like = ["aside", "historical", "biographical"];

export const theorem_like = ["algorithm", "claim", "corollary", "fact", "identity", "lemma", "proposition", "theorem"];

// can definition be axiom_like?
export const axiom_like = ["assumption", "axiom", "conjecture", "heuristic", "hypothesis", "principle"]

export const remark_like = ["convention", "insight", "note", "observation", "remark", "warning"];

export const example_like = ["example", "problem", "question"]

export const definition_like = ["definition"]

export const exercise_like = ["exercise"];

export const proof_like = ["proof"];

export const project_like = ["activity", "exploration", "investigation", "project"];

export const hint_like = ["hint", "answer", "solution"];

export const subpart_like = ["case", "task"];

export const inlinetags = ["em", "term", "alert", "m", "q", "c", "comment"];  // , "tag"];
// also need to handle self-closing tags

export const self_closing_inline_tags = ["idx", "latex", "tex", "pretext", "ie", "eg"];  //rethink this
export const possibly_self_closing_inline_tags = ["url"];

export const verbatim_tags = [...math_tags, "c", "code", "mrow", "sage", "biblio", "comment"];

export let structural_components = ["article", "chapter", "section", "subsection", "introduction", "worksheet", "paragraphs", "backmatter", "abstract"];

export let level_1_p_peers_containing_p = [ // peer of p cildren of (sub)sections
    ...aside_like, ...theorem_like, ...axiom_like, // ...list_like,  (this caused an infinite recursion)
    ...remark_like, ...example_like, ...definition_like, ...exercise_like,
    ...proof_like,
    ...project_like,
    ...hint_like,
    "blockquote", "sidebyside", "li",
];

export const tags_containing_paragraphs = [...structural_components, ...level_1_p_peers_containing_p, ...hint_like,
            ...subpart_like, ...randomtags_containing_p, "enumerate", "itemize", // "ol", "ul",
            "placeholder"];

export const display_environments = ["figure", "table", "listing", "enumerate", "itemize"];
export const display_subenvironments = ["image", "tabular", "program"];
export const display_subsubenvironments = ["latex-image", "prefigure", "description", "caption", "tikzpicture"];

export const other_level_1_p_peers = ["figure", "table", "tabular", "ol", "ul", "dl"];


export const tags_needing_statements = [...theorem_like, ...axiom_like, ...exercise_like, "task"];

export const tags_without_titles = ["p", "figure", "li", "ol", "ul", "dl", "enumerate", "itemize"];

      // more precisely: can possibly contain just text
export const tags_containing_text = ["text", "p",
    "fn", "em", "term", "alert", "q",
    "title", "li", "caption"];  // li can optionally contain a p or another list

                   // sit alone on a line with their content
export const title_like_tags = ["title", "idx", "caption"];

export const tags_with_weird_labels = ["figure", "table"];  // in LaTeX, these tend to go with the caption

export const subenvironments = {  // the tags which occun inside specific environments
   "listing": ["caption", "program"], // check
   "figure": ["caption","image"], // check
// missing: tabular > table
   "program": ["code"], // check
   "image": ["latex-image", "description", "prefigure"], // check
   "prefigure": ["diagram"], // check
   "diagram": ["predefinition", "coordinates", "annotations"], // check
};

export const containers = ["exercisegroup", "exercises", "prefigure", "tikzpicture",
                           "sage", "references", "comment",
                           "diagram", ...subenvironments["diagram"] ];

export const objects_with_substructure = Object.keys(subenvironments);

export const paragraph_peer_delimiters = [];

let paragraph_peer_ptx_and_latex_text = [...structural_components, ...level_1_p_peers_containing_p];
let paragraph_peer_ptx_and_latex_text_output = [...paragraph_peer_ptx_and_latex_text, ...list_like];
// plus some tags we don't expect people to type (go back and rethink this)
paragraph_peer_ptx_and_latex_text_output.push("p");
paragraph_peer_ptx_and_latex_text_output.push("statement");


// Note: no ">" in opening, because could have attributes,
// which are parsed later
paragraph_peer_ptx_and_latex_text.forEach( (el) => {
    paragraph_peer_delimiters.push( PreTeXtDelimiterOfAttributes(el) );
    paragraph_peer_delimiters.push( PreTeXtDelimiterOf(el) );
    paragraph_peer_delimiters.push( LaTeXDelimiterOf(el) );
});

paragraph_peer_delimiters.push( LaTeXDelimiterOf("sage") );


other_level_1_p_peers.forEach( (el) => {
    paragraph_peer_delimiters.push( PreTeXtDelimiterOfAttributes(el) );
    paragraph_peer_delimiters.push( PreTeXtDelimiterOf(el) );
    paragraph_peer_delimiters.push( LaTeXDelimiterOf(el) );
});

export let paragraph_peers = Array.from(paragraph_peer_delimiters, ({ tag }) => tag);
paragraph_peers = [...new Set(paragraph_peers)];   //remove duplicates


paragraph_peer_ptx_and_latex_text_output.forEach( (el) => {
    outputtags[el] = PTXcontaineroutput(el)
    });
other_level_1_p_peers.forEach( (el) => {
    outputtags[el] = PTXblockoutput(el)
    });
randomtags_containing_p.forEach( (el) => {
    outputtags[el] = PTXblockoutput(el)
    });

containers.forEach( (el) => {
    outputtags[el] = PTXblockoutput(el)
    });
[...display_environments, ...display_subenvironments, ...display_subsubenvironments].forEach( (el) => {
    outputtags[el] = PTXblockoutput(el)
    });



export let asymmetric_inline_delimiters = [
          {left:"\\(", right:"\\)", tag:"m"},
//          {left:"|", right:"|", tag:"placeholder"}  // just for testing
];

// need to handle self-closing tags
// also -- for emdash, and abbreviations, i.e., e.g.

inlinetags.forEach( (el) => {
    asymmetric_inline_delimiters.push(  PreTeXtDelimiterOf(el) )
});

inlinetags.forEach( (el) => {
    outputtags[el] = PTXinlineoutput(el)
    });

title_like_tags.forEach( (el) => {    // note:  `title` is handled in a special way
                                      // see reassemble.js (b/c title is an attribute
    outputtags[el] = PTXtitleoutput(el)
    });



// some special cases
outputtags["ol"] = {begin_tag: "<p>\n<ol", end_tag: "</ol>\n</p>",
         before_begin: "\n", after_begin: ">\n",
         before_end: "\n", after_end: "\n"};
outputtags["ul"] = {begin_tag: "<p>\n<ul", end_tag: "</ul>\n</p>",
         before_begin: "\n", after_begin: ">\n",
         before_end: "\n", after_end: "\n"};
outputtags["enumerate"] = outputtags["ol"];
outputtags["itemize"] = outputtags["ul"];

outputtags["tikzpicture"] = {begin_tag: "<image>\n<latex-image>\n\\begin{tikzpicture}",
         end_tag: "\\end{tikzpicture}\n</latex-image>\n</image>",
         before_begin: "\n", after_begin: "\n",
         before_end: "\n", after_end: "\n"};

outputtags["image"] = {begin_tag: "<image", end_tag: "</image>",  // should not be a special case?
         before_begin: "", after_begin: ">\n",
         before_end: "\n", after_end: "\n"};
outputtags["description"] = {begin_tag: "<description>", end_tag: "</description>",  // img or image?  should not be a special case?
         before_begin: "\n", after_begin: "",
         before_end: "", after_end: "\n"};

outputtags["comment"] = {begin_tag: "<!--", end_tag: "-->",  // should not be a special case?
         before_begin: "", after_begin: "",
         before_end: "", after_end: ""};

outputtags["p"] = PTXblockoutput("p")
outputtags["li"] = PTXblockoutput("li")


export const spacemath_environments = ["cases", "align", "system", "derivation", "linearsystem"];


//not used yet
export const possibleattributes = ["source", "ref", "width", "margins", "label", "xmlattributes",
                           "bbox", "dimensions", "destination", "text", "xml:id", "xmlns", "language"];

// start of major refactor: recognize that it takes multiple passes to
// parse into components, and this requires knowing which objects can occur
// inside of each other.

// The following lists are related by "can't be inside"

export let level = [];

level.push(["pretext"]);
level.push(["article"]);
level.push(["chapter"]);
level.push(["section"]);
level.push(["subsection"]);
level.push(["abstract"]);
level.push(["worksheet"]);
level.push(["backmatter"]);
level.push(["references"]);
level.push(["page"]);
level.push(["paragraphs", "objectives"]);
level.push(["sidebyside"]);
level.push([...project_like]);
level.push([...example_like, ...exercise_like]);
level.push(["introduction", "conclusion"]);
level.push([...theorem_like, ...axiom_like, ...remark_like, ...definition_like]);
level.push(["task"]);
level.push(["statement"]);
level.push([...proof_like, ...hint_like]);
level.push([...subpart_like]);
level.push([...aside_like]);
level.push([...display_environments]);
level.push([...display_subenvironments]);
level.push([...display_subsubenvironments]);
level.push(["prefigure"]);
level.push(["diagram"]);
level.push(subenvironments["diagram"]);
// level.push(["sage"]);
level.push([...list_like]);
level.push([...list_elements]);
level.push(["blockquote"]);
level.push(["p"]);
level.push("displaymath");
level.push(["mrow"]);
// level.push(["biblio"]);

export const attribute_like = [
    ["extraneous math", display_math_tags],
    ["workspace", [...exercise_like]],
    ["margins", ["worksheet", "sidebyside"]],
    ["margin", ["worksheet", "sidebyside"]],
    ["xmlattributes", "all"],
    ["title", "all"],
    ["label", "all"],
];

export const tagofmarker = {
    "-": "ul",
    "+": "ol",
    "*": "ul",
    "1": "ol"
}

// Tags can have many aliases
// (similar to, but less powerful, to the LaTeX `newcommand`)

export let aliases = { // in the format "officialname": [list of synonyms].  Taken from SL3X
    "abstract" : ["abs","abstr"],
    "acknowledgement" : ["ack"],
    "assumption" : ["assu","ass"],
    "axiom" : ["axm"],
    "blockquote" : ["quote", "center"],
    "claim" : ["cla"],
    "conjecture" : ["con","conj","conjec"],
    "convention" : ["conv"],
    "corollary" : ["cor","corr","coro","corol","corss"],
    "definition" : ["def","defn","dfn","defi","defin","de"],
    "enumerate" : ["enum","enuma","enumerit"],
    "example" : ["exam","exa","eg","exmp","expl","exm"],
    "exercise" : ["exer", "exers"],
    "em" : ["emph"],
    "fn" : ["footnote"],
    "hypothesis" : ["hyp"],
    "lemma" : ["lem","lma","lemm"],
    "notation" : ["no","nota","ntn","nt","notn","notat"],
    "observation" : ["obs"],
    "proof" : ["pf","prf","demo"],
    "proposition" : ["prop","pro","prp","props"],
    "question" : ["qu","ques","quest","qsn"],
    "remark" : ["rem","rmk","rema","bem","subrem","rems","rmks"],
    "theorem" : ["thm","theo","theor","thmss"],
 //   "ul" : ["itemize"],
    "verbatim" : ["verb"],
    "warning" : ["warn", "wrn"]
}


// the TeX \'{x} maps to 'x which becomes the key below
export const toUnicode = {
    "'a" : "á",
    "`a" : "à",
    '"a' : "ä",
    "^a" : "â",
    "~a" : "ã",
    "-a" : "ā",
    "'A" : "Á",
    "`A" : "À",
    '"A' : "Ä",
    "^A" : "Â",
    "~A" : "Ã",
    "cc" : "ç",
    "cC" : "Ç",
    "'e" : "é",
    "`e" : "è",
    '"e' : "ë",
    "^e" : "ê",
    "-e" : "ē",
    "'E" : "É",
    "`E" : "È",
    '"E' : "Ë",
    "^E" : "Ê",
    "-E" : "Ē",
    "-g" : "ḡ",
    "ug" : "ğ",
    "vg" : "ǧ",
    "-G" : "Ḡ",
    "uG" : "Ğ",
    "vG" : "Ǧ",
    "'i" : "í",
    "`i" : "ì",
    '"i' : "ï",
    "^i" : "î",
    "-i" : "ī",
    "'I" : "Í",
    "`I" : "Ì",
    '"I' : "Ï",
    "^I" : "Î",
    "-I" : "Ī",
    "~n" : "ñ",
    "~N" : "Ñ",
    "'o" : "ó",
    "`o" : "ò",
    '"o' : "ö",
    "^o" : "ô",
    "-o" : "ō",
    "~o" : "õ",
    "Ho" : "ő",
    "'O" : "Ó",
    "`O" : "Ò",
    '"O' : "Ö",
    "^O" : "Ô",
    "-O" : "Ō",
    "~O" : "Õ",
    "HO" : "Ő",
    "'u" : "ú",
    "`u" : "ù",
    '"u' : "ü",
    "^u" : "û",
    "'U" : "Ú",
    "`U" : "Ù",
    '"U' : "Ü",
    "^U" : "Û",
}

