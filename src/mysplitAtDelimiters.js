/* eslint no-constant-condition:0 */

import { aliases, display_math_tags, possibleattributes, tags_containing_paragraphs, hint_like } from "./data";
import { toUnicode, subenvironments, containers, spacemath_environments, tags_with_weird_labels} from "./data";
import { paragraph_peer_delimiters, inlinetags } from "./data";
import { display_math_delimiters, delimitersFromList, PreTeXtDelimiterOfAttributes } from "./data";
import { document_metadata, splitLI } from "./parse";
import { sanitizeXMLattributes, sanitizeXMLstring } from "./reassemble";
import { alert } from "./utils";


const findEndOfMath = function(delimiter, text, startIndex) {
    // Adapted from
    // https://github.com/Khan/perseus/blob/master/src/perseus-markdown.jsx
    let index = startIndex;
    let braceLevel = 0;

    const delimLength = delimiter.length;

    while (index < text.length) {
        const character = text[index];

        if (braceLevel <= 0 &&
            text.slice(index, index + delimLength) === delimiter) {
            return index;
        } else if (character === "\\") {
            index++;
        } else if (character === "{") {
            braceLevel++;
        } else if (character === "}") {
            braceLevel--;
        }

        index++;
    }

    return -1;
};

const firstBracketedString = function(text, depth=0, lbrack="{", rbrack="}") {
      // given {A}B, return [{A},B] if possible.  Otherwise return ["",{A}B]

    let thetext = text.trimStart();

    if (!thetext) {
        console.log("empty string sent to first_bracketed_string()");
        return ["",""]
    }

    let previouschar = "";
    let currentchar = "";
    let firstpart = "";
       // we need to keep track of the previous character becaause \{ does not
       // count as a bracket

    if (depth == 0 && thetext[0] != lbrack) {
        return ["",thetext]
    } else if (depth == 0) {
        firstpart = lbrack;
        depth = 1;
        thetext = thetext.substring(1)
    } else {
        firstpart = ""   // should be some number of brackets?
    }

    while (depth > 0 && thetext) {
        currentchar = thetext.substring(0,1);
        if (currentchar == lbrack && previouschar != "\\") {
            depth += 1
        } else if (currentchar == rbrack && previouschar != "\\") {
            depth -= 1
        }

        firstpart += currentchar;
        if (previouschar == "\\" && currentchar == "\\") {
            previouschar = "\n"
        } else {
            previouschar = currentchar
        }

        thetext = thetext.substring(1)
    }

    if (depth == 0) {
        return [firstpart, thetext]
    } else {
        console.log("no matching bracket %s in %s XX", lbrack, thetext)
        return ["",firstpart.substring(1)]   // firstpart should be everything
                                  // but take away the bracket that doesn't match
    }
}

const escapeRegex = function(string) {
    return string.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};

const amsRegex = /^\\AAAAAAAbegin{/;    // }

var parsecount = 0;

export const splitIntoParagraphs = function(nodelist, nodestoparse, peernodes) {

    if (typeof nodelist == "string") {    // seems that this never happens?
        return splitTextIntoParagraphs(nodelist)
    }

    if (!Array.isArray(nodelist)) {
// console.log("splitting of non-array content:", nodelist);
        let newnodelist = {...nodelist}
        newnodelist.content = splitIntoParagraphs(newnodelist.content, nodestoparse, peernodes);
        return newnodelist
    }

// console.log("splitting of an array content:", nodelist);

    let newnodelist = [];

    let current_new_text = "";

    nodelist.forEach( (element, index) => {

// console.log("readt to parse", element);

      // if we have a content node which is a paragraph peer,
      // end and save the current paragraph (if nonempty),
      // and save the new content node
      if (peernodes.includes(element.tag)) {
          if (current_new_text) {
            newnodelist.push({tag: "p", content: current_new_text});
            current_new_text = "";
          }
          // if element needs to be parsed
          if (tags_containing_paragraphs.includes(element.tag) && typeof element.content == "string") {
              element.content = splitTextAtDelimiters(element.content, paragraph_peer_delimiters);
              element.content = splitIntoParagraphs(element.content, nodestoparse, peernodes)
          } else if (tags_containing_paragraphs.includes(element.tag)) {
// ????
              element.content = splitIntoParagraphs(element.content, nodestoparse, peernodes)
          }
          newnodelist.push(element);
      } else if (element.tag == "text") {

          const this_text = element.content.split(/\n\s*\n{1,}/);
//  console.log("found ", this_text.length, " pieces, which are:", this_text);
          this_text.forEach( (element) => {
              const this_new_text = current_new_text + element;
              if (this_new_text) {  // skip empty paragraphs
// console.log("made this_new_text", this_new_text);
                const this_new_paragraph = {tag:"p", content: this_new_text};
                newnodelist.push(this_new_paragraph)
              }
              current_new_text = ""
          })

      } else if (typeof element.content == "string" && tags_containing_paragraphs.includes(element.tag)) {

          let this_new_content = [];
          const this_text = element.content.split(/\n\s*\n{1,}/);
// console.log("found ", this_text.length, " pieces, which are:", this_text);
          this_text.forEach( (element) => {
              const element_trimmed = element.trim();
              if (element_trimmed) {
                  this_new_content.push({tag: "p", content: element_trimmed})
              }
          });

          element.content = this_new_content;
          newnodelist.push(element)

      } else { newnodelist.push(element) }
    });
    return newnodelist
}

const splitTextIntoParagraphs = function(text) {
      // check that it was given a string?

    let newnodelist = [];

    let current_new_text = "";

    const this_text = text.split(/\n\s*\n{1,}/);
// console.log("found ", this_text.length, " pieces, which are:", this_text);
    this_text.forEach( (element) => {
        const this_new_text = current_new_text + element;
        if (this_new_text) {  // skip empty paragraphs
// console.log("made this_new_text", this_new_text);
          const this_new_paragraph = {tag:"p", content: this_new_text};
          newnodelist.push(this_new_paragraph)
        }
        current_new_text = ""
    })

    return newnodelist
}

const splitTextAtDelimiters = function(this_content, delimiters) {  // based on Katex

    if (typeof this_content != "string") { alert("expected string in splitTextAtDelimiters", this_content) }
    var text = this_content;
    let index;
    const data = [];

//  console.log("delimiters", delimiters);

    const regexLeft = new RegExp(
        "(" + delimiters.map((x) => escapeRegex(x.left)).join("|") + ")"
    );

    while (true) {
        index = text.search(regexLeft);
        if (index === -1) {
            break;
        }
        if (index > 0) {
            data.push({
                tag: "text",
                content: text.slice(0, index),
            });
            text = text.slice(index); // now text starts with delimiter
        }
        //  so this always succeeds:
        const i = delimiters.findIndex((delim) => text.startsWith(delim.left));
        index = findEndOfMath(delimiters[i].right, text, delimiters[i].left.length);
        if (index === -1) {
            break;
        }
        const rawData = text.slice(0, index + delimiters[i].right.length);
        const mathcontent = amsRegex.test(rawData)
            ? rawData
            : text.slice(delimiters[i].left.length, index);
        data.push({
    //        type: "math",
            tag: delimiters[i].tag,
            content: mathcontent,
     //       rawData,
        });
        text = text.slice(index + delimiters[i].right.length);
    }

//    if (text !== "") { }    // are there times we want to save whitespace text nodes?
    if (!text.match(/^\s*$/)) {
        data.push({
            tag: "text",
            content: text,
        });
    }

//     console.log("leaving splitTextAtDelimiters", data, "   ", data.length);

//    if (data.length == 1 && data[0].tag == 'text') { return text }
//    else { return data }
    return data
};

const recastSpacedDelimiters = function(this_content) {

    if (typeof this_content != "string") { alert("expected a string, but got:", this_content) }
    let the_text = this_content;


// need to do this properly, from spacelike_inline_delimiters
// example:   {left:"_", right:"_", tag:"term"},
//        const regexp =
    the_text = the_text.replace(/(^|\s|~)\$([^\$\n]+)\$(\s|$|[.,!?;:\-<\}]|\)|th\b|st\b|nd\b)/mg, "$1<m>$2</m>$3");
    the_text = the_text.replace(/(^|\s)_([^_\n]+)_(\s|$|[.,!?;:])/mg, "$1<term>$2</term>$3");
    the_text = the_text.replace(/(^|\s)\*\*([^*\n]+)\*\*(\s|$|[.,!?;:])/mg, "$1<alert>$2</alert>$3");
    the_text = the_text.replace(/(^|\s)\*([^*\n]+)\*(\s|$|[.,!?;:])/mg, "$1<em>$2</em>$3");
    the_text = the_text.replace(/(^|\s)``([^'"`\n]+)''(\s|$|[.,!?;:])/mg, "$1<q>$2</q>$3");
    the_text = the_text.replace(/(^|\s)``([^'"`\n]+)"(\s|$|[.,!?;:])/mg, "$1<q>$2</q>$3");
    the_text = the_text.replace(/(^|\s)`([^'"`\n]+)'(\s|$|[.,!?;:])/mg, "$1<q>$2</q>$3");
    the_text = the_text.replace(/(^|\s)"([^"\n]+)"(\s|$|[.,!?;:])/mg, "$1<q>$2</q>$3");
    the_text = the_text.replace(/(^|\s)'([^'\n]+)'(\s|$|[.,!?;:])/mg, "$1<q>$2</q>$3");
//    the_text = the_text.replace(/(^|\s)`([^`\n]+)`(\s|$|[.,!?;:])/mg, "$1<q>$2</q>$3");
    the_text = the_text.replace(/(^|[^`a-zA-Z0-9])`([^`\n]+)`($|[^`a-zA-A0-9])/mg, "$1<c>$2</c>$3");
// `  because the editor is confused by backticks
    return the_text
}

const texLike = function(this_content) {

        let new_text = "";
        new_text = this_content.replace(/([^-])\-\-([^-])/mg, "$1<mdash/>$2");

        new_text = new_text.replace(/{\\em +/g, "\\em{");
        new_text = new_text.replace(/{\\bf +/g, "\\textbf{");
        new_text = new_text.replace(/{\\it +/g, "\\textit{");
        new_text = new_text.replace(/{\\sc +/g, "\\sc{");

        new_text = new_text.replace(/\bLaTeX\b/mg, "<latex/>");
        new_text = new_text.replace(/\bTeX\b/mg, "<tex/>");
        new_text = new_text.replace(/\bPreTeXt\b/mg, "<pretext/>");
        new_text = new_text.replace(/([^\\])~/mg, "$1<nbsp/>");
            // for those who write (\ref{...}) instead of \eqref{...}
        new_text = new_text.replace(/\(\\(ref|eqref|cite){([^{}]+)}\)/g, function(x,y,z) {
                                  z = z.replace(/, */g, " ");
                                  z = sanitizeXMLattributes(z);
                                  return '<xref ref="' + z + '"/>'
                      //            return '<xref ref="' + z.replace(/, */g, " ") + '"/>'
                              });
        new_text = new_text.replace(/\\(ref|eqref|cite){([^{}]+)}/g, function(x,y,z) {
                       //           return 'PPPPPPP';
                                  z = z.replace(/, */g, " ");
                                  z = sanitizeXMLattributes(z);
                                  return '<xref ref="' + z + '"/>'
                              });
   //     new_text = new_text.replace(/\\fn{([^{}]+)}/g, "<fn>$1</fn>");

        new_text = new_text.replace(/\\(caption){([^{}]+)}/sg, "<$1>$2</$1>");
        new_text = new_text.replace(/\\(caption)\s*({.*)/sg, function(x,y,z) {  // }
            let caption_plus = firstBracketedString(z);
// console.log("caption_plus[0]", caption_plus[0]);
            return "<" + y + ">" + convertTextInPlace(caption_plus[0]) + "</" + y + ">" + "\n" + z
        });
        new_text = new_text.replace(/\\(q|term|em|m|c|fn){([^{}]+)}/g, "<$1>$2</$1>");
        new_text = new_text.replace(/\\(url|href){([^{}]+)}({|\[)([^{}\[\]]+)(\]|})/g, function(x,y,z,p,w) {
                                  return '<url href="' + z + '">' + w + '</url>'
                              });
        new_text = new_text.replace(/\\(url|href){([^{}]+)}([^{]|$)/g, function(x,y,z) {  // }
                                  return '<url href="' + z + '"/>'
                              });
// console.log("found genuine text:", this_content, "which is now",new_text);
        return new_text
}

const texFonts = function(this_content) {

    let new_text = "";
    new_text = this_content.replace(/\\('|"|\^|`|~|-|c|H|u|v) ([a-zA-Z])/mg, accentedASCII);
    new_text = new_text.replace(/\\('|"|\^|`|~|-)([a-zA-Z])/mg, accentedASCII);
    new_text = new_text.replace(/\\('|"|\^|`|~|-|c|H|u|v){([a-zA-Z])}/mg, accentedASCII);

    return new_text
}

const accentedASCII = function(fullstring, accent, letter) {

    return toUnicode[accent + letter]
}

export const convertTextInPlace = function(this_content) {

    let the_text = this_content;
    the_text = recastSpacedDelimiters(the_text);
    the_text = texLike(the_text);
    the_text = texFonts(the_text);

    return the_text
}

const preprocessAliases = function(this_content) {

    if (typeof this_content != "string") { alert("expected a string, but got:", this_content) }
    let the_text = this_content;

    for (let [key, value] of Object.entries(aliases)) {
      let trueName = key;
// console.log("a key=trueName", key);
      value.forEach( (element) => {
          let unofficialName = element;
          the_text = the_text.replace("<" + unofficialName + ">", "<" + trueName + ">");
          the_text = the_text.replace("<" + unofficialName + " ", "<" + trueName + " ");
          the_text = the_text.replace("</" + unofficialName + ">", "</" + trueName + ">");
          the_text = the_text.replace("\\begin{" + unofficialName + "}", "\\begin{" + trueName + "}");
          the_text = the_text.replace("\\end{" + unofficialName + "}", "\\end{" + trueName + "}");
          the_text = the_text.replace("\\" + unofficialName + "{", "\\" + trueName + "{");
      });
    }

 // should this be in a separate funciton?
    inlinetags.forEach( (element) => {
      var regex = new RegExp("\\\\" + element + "{([^{}]+)}", "g");
      the_text = the_text.replace(regex, "<" + element + ">$1</" + element + ">")
    });

    return the_text
}


export const splitAtDelimiters = function(parse_me, taglist, thisdepth, maxdepth, toenter="all", toprocess="all", parent_tag="" ) {

    let delimiters = [];
    if (typeof taglist == "string") {
        if (taglist == "displaymath") { delimiters = display_math_delimiters }
        else if (taglist == "spacelike") { delimiters = "spacelike" }    // do nothing, because this is handled later
        else { alert("unknown taglist " + taglist) }
    } else if (typeof taglist[0] == "string") {
        delimiters = delimitersFromList(taglist)
    } else {
        delimiters = taglist
    }
// if(taglist == "p") {
// console.log(thisdepth, " ", maxdepth, " type of parse_me", typeof parse_me, "tag search", delimiters, "from taglist", taglist);
// }

    // splitting a text node means replacing it by a list of nodes
    // splitting a non-text node (which is represented by a list)
    // means replacing its content by a list of nodes

// console.log("starting splitAtDelimiters", parse_me, taglist, toenter, toprocess, parent_tag);

    let newnodelist = [];

    if (Array.isArray(parse_me)) {
//console.log("found an array, of length", parse_me.length);

        parse_me.forEach( (element, index) => {

// console.log(index, "  ", typeof element, " ", element.tag);

           if (thisdepth > maxdepth && element.tag != "text") {
              newnodelist.push(element)
           } else {

// console.log("parsing", index, "  ", typeof element, "   ", element);

//console.log("readt to parse", element);

// console.log("from:", element);
              let this_element_parsed;
              if (toenter == "all" || toenter.includes(element.tag)) {
                  this_element_parsed = splitAtDelimiters(element, taglist, thisdepth+1, maxdepth, toenter, toprocess, element.tag)
              } else { this_element_parsed = element }
// console.log("to:", this_element_parsed);

//              newnodelist.push(this_element_parsed)
              if(Array.isArray(this_element_parsed)) {
                  this_element_parsed.forEach( (element) => { newnodelist.push(element) } );
              } else { newnodelist.push(this_element_parsed) }
            }
         });

        return newnodelist

    } else if (typeof parse_me == 'string') {

// console.log("prodeccins a string with parent_tag", parent_tag, "at depth", thisdepth, "of", maxdepth, "eith", delimiters);

        if (thisdepth > maxdepth + 2) { return parse_me }   // why +2 ?

        if (delimiters === 'spacelike') {
            if (toprocess=="all" || toprocess.includes(parent_tag)) { return recastSpacedDelimiters(parse_me) }
            else { return parse_me }
        }

        let new_content = parse_me;  // why rename it?

        if (delimiters === 'makeparagraphs') {
            if (toprocess=="all" || toprocess.includes(parent_tag)) {
                new_content = splitTextIntoParagraphs(new_content)
            } else {
                //  pass
            }
        } else {
            if (toprocess=="all" || toprocess.includes(parent_tag)) {
                new_content = splitTextAtDelimiters(new_content, delimiters)
            } else {
                //  pass
            }
        }
// console.log("new_content", new_content);
        return new_content

    } else {  // parse_me must be an object, but check

       if (false && typeof parse_me != "object") { alert("wrong category for ", parse_me) }

// console.log("parse_me",parse_me, taglist);
       let current_object = {...parse_me}
//  console.log("now current_object is", current_object);
// console.log("dealing with", current_object, "of depth", thisdepth, "with max", maxdepth,toprocess, thisdepth > maxdepth, delimiters);
       if (thisdepth > maxdepth && current_object.tag != "text") { return current_object }

       let new_content = current_object.content;

       if (toenter == "all" || toprocess.includes(current_object.tag)) {
// console.log("making new_content");
           new_content = splitAtDelimiters(new_content, taglist, thisdepth+1, maxdepth, toenter, toprocess, current_object.tag)
       }
// console.log("now new_content", new_content);
//  console.log("renow current_object is", current_object);
       if (current_object.tag == "text" && typeof new_content == "string") { current_object.content = new_content }
       else if (current_object.tag != "text") {
          if (new_content.length == 1 && new_content[0].tag == "text") {
//  console.log("arenow current_object is", current_object);
            current_object.content = new_content[0].content
          } else {
            current_object.content = new_content
          }
       } else {
          current_object = new_content
       }

//  console.log("then current_object is", current_object);
       return current_object

    }

    alert("should be unreachable: unrecognized category for: ", parse_me)
}

export const extract_lists = function(this_content, action, thisdepth=0, maxdepth=0, tags_to_process="all", parent_tag="", parent_parent_tag="", root_tag="section") {

    let newnodelist = [];

    let current_new_text = "";

// console.log("extract_lists of ", action, "this_content");
    if (Array.isArray(this_content)) {
//  console.log("found an array, length", [...this_content]);

        this_content.forEach( (element, index) => {

          let this_node;
          if (typeof element == "object") {
//  console.log("going to extract", element);
              this_node = extract_lists({...element}, action, thisdepth+1, maxdepth, tags_to_process, element.tag, parent_tag);
          }
          else {
              this_node = extract_lists(element, action, thisdepth+1, maxdepth, tags_to_process, parent_tag, parent_parent_tag);
          }

          newnodelist.push(this_node)

        });

    } else if (typeof this_content == "object") {

          // need to rethink how to handle the case where the oneline is an attribute.
          if (action == "oneline environments" && this_content.tag == "p" // &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "string" ) {

            if (this_content.content.match(/^\s*([A-Za-z]+):/)) {    // originally required :\s
// console.log("spacemath_environments", spacemath_environments, "this_content", this_content);
                let split_content = this_content.content.split(":", 1);
                let new_tag = split_content[0].toLowerCase();
                new_tag = new_tag.trim();
// console.log("new_tag", new_tag);
                if ( !spacemath_environments.includes(new_tag) ) {
                    const new_content = this_content.content.replace(/^\s*[^:]*:\s*/,"");

                    this_content.tag = new_tag;
                    this_content.content = new_content;
                }
            }

          } else if (action == "extract li"  && 
                (this_content.tag == "p" || this_content.tag == "enumerate" || this_content.tag == "itemize")
                      && typeof this_content.content == "string" ) {

            if (this_content.content.match(/^\s*\\item\s/)) {
                const new_tag = "li";
                const new_content = this_content.content.replace(/^\s*\\item\s*/,"");

                this_content.tag = new_tag;
                this_content.content = new_content;
            } else if (this_content.content.match(/^\s*\\item\[[^\[\]]*\]\s*/)) {
                const new_tag = "li";
                const new_content = this_content.content.replace(/^\s*\\item\[[^\[\]]*\]\s*/,"");

                this_content.tag = new_tag;
                this_content.content = new_content;
            } else if (this_content.content.match(/^\s*(\-|\*)+\s/)) {
                const new_tag = "li";
                const new_content = this_content.content.replace(/^\s*(\-|\*)+\s*/,"");

                this_content.tag = new_tag;
                this_content.content = new_content;
                this_content._parenttag = "ul"
            } else if (this_content.content.match(/^\s*\++\s/)) {
                const new_tag = "li";
                const new_content = this_content.content.replace(/^\s*\++\s*/,"");

                this_content.tag = new_tag;
                this_content.content = new_content;
                this_content._parenttag = "ol"
            } else if (this_content.content.match(/^\s*\(*[0-9]+\.*\)*\s/)) {
                //looking for 1 or 1. or 1) or (1) or (1.)
                const new_tag = "li";
                const new_content = this_content.content.replace(/^\s*\(*[0-9]+\.*\)*\s*/,"");

                this_content.tag = new_tag;
                this_content.content = new_content;
                this_content._parenttag = "ol"
            }

          } else if (action == "xmlattributes" // &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "string" ) {

            var regex = new RegExp("^\\s*(" + possibleattributes.join("|") + ")[^<>+]*>", "s");
            if (regex.test(this_content.content) || this_content.content.match(/^\s*[^\n<>+%\`\\$()]*>/)) {
//   console.log("maybe found an xmlattribute", this_content.content);
                if (this_content.content.match(/^\s*>/)) { //no actual attribute
                  this_content.content = this_content.content.replace(/^\s*>/, "")
                } else {
                  let this_attribute = this_content.content.split(">", 1)[0];

//  console.log("this attribute", this_attribute);
           //       this_content.content = this_content.content.replace(/^\s*[^\n<>+]*>/, "")
                  this_content.content = this_content.content.replace(/^\s*[^<>%]*?>/s, "")
// console.log("now this_content.content",this_content.content);
                  if ("xmlattributes" in this_content) {
                    this_content.xmlattributes += this_attribute
                  } else {
                    this_content.xmlattributes = this_attribute
                  }
                }
              }
            } else if (action == "attributes" // &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "string") {

      //      const this_text = this_content.content.split(/\n\s*\n{1,}/);
            const this_text = this_content.content.split(/(\n\s*\n{1,})/);

            if (this_text.length > 1) {
              let new_content = "";
              var regex = new RegExp("^(" + possibleattributes.join("|") + ")");

              this_text.forEach( (txt) => {
                let this_txt = txt.trim();
                if (regex.test(this_txt)) {
// console.log("found an attribute", this_txt);
// console.log("split1", this_txt.split(":", 1));
// console.log("split2", this_txt.split(":", 2));
                    let this_attribute = this_txt.split(":", 1)[0];
                    let this_attribute_value = this_txt.split(":", 2)[1].trim();
                    this_content[this_attribute] = this_attribute_value
                } else {
                   new_content += txt
                }
              });

              this_content.content = new_content
            }

          } else if (action == "title"  && !containers.includes(this_content.tag)
                      && typeof this_content.content == "string" ) {
// console.log("title of", this_content);

            if (this_content.content.match(/^\s*\[/) ||
                 this_content.content.match(/^\s*<title>/)) {
//  console.log("maybe found a title", this_content.content);
                if (this_content.content.match(/^\s*\[/)) { //LaTeX style
                  let this_title = this_content.content.split("]", 1)[0];
                  this_title = this_title.replace(/\s*\[/,"");
                  this_content.title = this_title
                  this_content.content = this_content.content.replace(/^\s*\[[^\[\]]*\]/,"");
// console.log("added a title to ", this_content);
                } else {
                  let this_title = this_content.content.split("</title>", 1)[0];
                  this_title = this_title.replace(/\s*<title>/,"");
                  this_content.title = this_title;
                  this_content.content = this_content.content.replace(/^\s*<title>.*?<\/title>/,"");
                }
            }

          } else if (action == "label" // &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "string" ) {

            if (this_content.content.match(/^\s*(\\*)label{[^{}]*}/)) {
//  console.log("maybe found a label", this_content.content);
                  let this_label = this_content.content.replace(/^\s*(\\*)label{([^{}]*)}.*/s, "$2");
//console.log("found a label:", this_label);
                  this_label = sanitizeXMLattributes(this_label);
                  this_content.id = this_label;
                  this_content.content = this_content.content.replace(/^\s*(\\*)label{([^{}]*)}\s*/, "")
            }

          } else if (action == "images" // &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "string" ) {

            if (this_content.content.match(/\\includegraphics/)) {

// console.log("images", this_content);
                  this_content.content = this_content.content.replace(/\\includegraphics\[[^\[\]]*\]\s*{\s*([^{}]*)\s*}/,
                               '<image source="$1" width="50%"/>');
                  this_content.content = this_content.content.replace(/\\includegraphics\s*{\s*([^{}]*)\s*}/,
                               '<image source="$1" width="50%"/>');
            }
            if (this_content.content.match(/\\caption/)) {

// console.log("caption", this_content);
              this_content.content = this_content.content.replace(/\\(caption)\s*({.*)/sg, function(x,y,z) {  // }
                  let caption_plus = firstBracketedString(z);
// console.log("caption_plus[0]", caption_plus[0]);
                  let this_caption = caption_plus[0].slice(1,-1).trim();
                  this_caption = this_caption.replace(/\\(text)*(rm|sf|it|bf|sl)*\s*/, "");
                  return "<" + y + ">" + convertTextInPlace(this_caption) + "</" + y + ">" + "\n" + caption_plus[1]
              });
            }

          } else if (action == "statements"  // &&  tags_to_process.includes(this_content.tag)
                      && tags_to_process.includes(parent_tag) ) {

// console.log("inserting statements on ", this_content, "with content", {...this_content.content});

            let this_statement_content = [];
            let this_statement = {};

            if (typeof this_content.content == "string") {  // unlabeled statement and no hint/answer/etc
              this_statement_content = [{tag: "text", content: this_content.content}]
              this_statement = {tag: "statement", content: this_statement_content}
              this_content.content = [this_statement]
            } else {  // first check if ther explicitly is a statement

              let foundstatement = false;
              this_content.content.forEach( (el) => { if (el.tag == "statement") { foundstatement = true } });

              if (!foundstatement) {
                let element = "";
                let index = 0;
                for (index = 0; index < this_content.content.length; ++index) {
                    element = this_content.content[index]
                    if (hint_like.includes(element.tag)) {
                      break
                    } else {
                      this_statement_content.push(element)
                    }
                }

                this_statement = {tag: "statement", content: this_statement_content}
                let remaining_pieces = this_content.content.slice(index);
                remaining_pieces.unshift(this_statement);
                this_content.content = remaining_pieces
              }
            }

            } else if (action == "prefigure" && tags_to_process.includes(this_content.tag)) {
// console.log("processing prefigure", this_content, "with parent", parent_tag, "and p_p_tag", parent_parent_tag, "with content", this_content.content);
// alert("looking for xmlns");
            if (!("xmlns" in this_content)
                     && !("xmlattributes" in this_content && this_content["xmlattributes"].includes("xmlns"))) {
                            this_content["xmlns"] = "https://prefigure.org" }

            let this_diagram_content = [];
            let this_diagram = {};

            if (typeof this_content.content == "string") {  // unlabeled diagram and no hint/answer/etc

              const this_content_was = this_content.content;

         //     this_diagram_content = [{tag: "text", content: this_content_was}]
              this_diagram_content = this_content_was;
              this_diagram = {tag: "diagram", content: this_diagram_content}
              if ("dimensions" in this_content) {
                  this_diagram["dimensions"] = this_content.dimensions;
                  delete this_content["dimensions"]
              }
              if ("margins" in this_content) {
                  this_diagram["margins"] = this_content.margins;
                  delete this_content["margins"]
              }
              this_content.content = [this_diagram]

// console.log("so far, this_content", this_content);
// alert("a prefigure");
              if ("bbox" in this_content) {  // need to make a coordinates child
// console.log("found bbox");
                let this_coordinates = {tag: "coordinates", bbox: this_content["bbox"], content: this_content_was };
                delete this_content["bbox"];
                this_diagram.content = [this_coordinates];

              }

// alert("b prefigure");
            }

            if (parent_parent_tag != "image") {  // need to wrap in image
                let this_content_copy = {...this_content};
                this_content_copy["content"] = [...this_content["content"]];
                this_content = {tag: "image", content: [this_content_copy]};
                if ("width" in this_content_copy) {
                    this_content["width"] = this_content_copy["width"];
                    delete this_content_copy["width"]
                }

             }
            } else if (action == "sage" && tags_to_process.includes(this_content.tag)) {
// console.log("processing prefigure", this_content, "with parent", parent_tag, "and p_p_tag", parent_parent_tag, "with content", this_content.content);
// alert("looking for xmlns");

            let this_code = this_content.content.trim();

            let language = "";
            if (this_code.match(/\s*{/)) {  // }
                let lang_and_code = firstBracketedString(this_code);
// console.log("lang_and_code", lang_and_code);
                language = lang_and_code[0].slice(1,-1);
                this_code = lang_and_code[1];
            }
            if (language) {this_content.language = language}

            this_content.content = "<input>\n" + sanitizeXMLstring(this_code) + "\n</input>";

          } else if (action == "blockquotes"  &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "string" ) {  // also must handle case of array

            if (this_content.content.match(/^\s*\+\+\+sTaRTbQ>/)) {
              let new_content_text = this_content.content.replace(/^\s*\+\+\+sTaRTbQ>/, "");
              new_content_text = new_content_text.replace(/\n\s*>/g, "\n");
      // need to handle the case that there are multiple paragraphs
              let new_content_separated = new_content_text.split(/\n\s*\n{1,}/);
              let new_content_list = [];
              new_content_separated.forEach( (element, index) => {
                  new_content_list.push({tag: "p", content: element});
              });
              this_content.content = new_content_list;
              this_content.tag = "blockquote";
            }

          } else if (action == "substructure"  &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "string" ) {

// console.log("found substructure of", this_content.tag, "with", this_content.content);
              const subtags = subenvironments[this_content.tag];
// console.log("looking for:", subtags);
              const subtags_as_delims = delimitersFromList(subtags);
// console.log("looking for:", subtags_as_delims);
              const this_environment_split = splitTextAtDelimiters(this_content.content, subtags_as_delims);
// console.log("found", this_environment_split);
              this_content.content = [...this_environment_split];

          } else if (action == "clean up substructure"  &&  tags_to_process.includes(this_content.tag)
                      && Array.isArray(this_content.content)) {

             const this_tag = this_content.tag;

             let new_content = [];
             this_content.content.forEach( (el) => {
                if ( subenvironments[this_tag].includes(el.tag)) {
                    new_content.push(el)
                } else if (possibleattributes.includes(el.tag)) {
                    this_content[el.tag] = el.content;
                } else {
// console.log("looking for an attribute", el);
                    if (el.tag == "text" && el.content.match(/^\s*$/) && "attributes" in el) {
                      if ("attributes" in this_content) { this_content.attributes += el.attributes }
                      else { this_content.attributes = el.attributes }
                    } else if (el.tag == "text" && el.content.match(/^\s*$/)) {
                      // pass
                    } else { console.log("problem content", el); alert("problem content: see console.log") }
                }
    });
              this_content.content = [...new_content]

          } else if (action == "extraneous math"  &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "string" ) {

       //  because $$ are both begin and end tags, markers were mistakenly also put
       // at the start of $$ math.  So remove them
// console.log("this_content.content AA", this_content.content);
              this_content.content = this_content.content.replace(/^\s*\+\+\+saMePaR/, "");
// console.log("this_content.content BB", this_content.content);

          } else if (action == "gather li"  &&  tags_to_process.includes(this_content.tag)
                      && typeof this_content.content == "object" ) {  // actually, must be an array

            let this_statement_content = [];

            let element = "";
            let index = 0;
            let found_list = false;
            let new_list_content = [];
            let new_list_object = {};
            for (index = 0; index < this_content.content.length; ++index) {
                element = this_content.content[index]

                if (!found_list && element.tag != "li") {
                  this_statement_content.push(element)
                } else if (!found_list && element.tag == "li") {
                  found_list = true;
                  new_list_content = [element];
                  new_list_object.tag = element._parenttag;
// console.log("started a new list", new_list_content);
                } else if (found_list && element.tag == "li") {
                  new_list_content.push(element)
                } else if (found_list && element.tag != "li") {
                  new_list_object.content = [...new_list_content];
                  this_statement_content.push({...new_list_object});
                  found_list = false;
                  new_list_object = {};
                  new_list_content = [];
                  this_statement_content.push(element);
                }
            }

            if (found_list) { //this means the environment ended with at list, which has not been saved
              new_list_object.content = new_list_content;
              this_statement_content.push({...new_list_object})
            }

            found_list = false;
            new_list_content = [];
            new_list_object = {};

            this_content.content = this_statement_content

          } else if (action == "split li"  &&  tags_to_process.includes(this_content.tag)
                  //    && typeof this_content.content == "string" ) {  // actually, must be an array  //}
                      && typeof this_content.content == "object" ) {  // actually, must be an array

              this_content = splitLI(this_content)

          } else if (action == "absorb math"  && ( tags_to_process.includes(this_content.tag) || this_content.tag == root_tag )
                      && typeof this_content.content == "object" ) {  // actually, must be an array

  // these cases can be consolidated, but it took me a while to figure out
  // what to do and I have not gone back to refactor


//  console.log("this_content.content",this_content.content[0], [...this_content.content]);
            let this_new_content = [];

            let element = "";
            let index = 0;
            for (index = 0; index < this_content.content.length; ++index) {
                element = this_content.content[index]
// console.log("element", element);
                const items_so_far = this_new_content.length;
                if (display_math_tags.includes(element.tag)) {
         // display math should not start a paragraph, so connect to previous p, if it exists
                  if (items_so_far == 0) {
         // should not happen, but just in case
console.log("it happened 1", element);
                    this_new_content.push({...element})
                  } else if(this_new_content[items_so_far - 1].tag != "p") {   // again, should not happen
console.log("it happened 2", element);
                    this_new_content.push({...element})
                  } else {  //last was a p, so put the display math on the end
                    if (typeof this_new_content[items_so_far - 1].content == "string") {
         //tricky case, because we need to make ti a list so we can append to it
                      this_new_content[items_so_far - 1].content = [{tag: "text", content: this_new_content[items_so_far - 1].content}];
                      this_new_content[items_so_far - 1].content.push({...element})
                    } else {
                      this_new_content[items_so_far - 1].content.push({...element})
                    }
                  }
                } else if (element.tag == "p") {
         // either connect to previous element, or not
// console.log("element", element.tag, "with", element.content);
                  if (typeof element.content == "string" && element.content.match(/\s*\+\+\+saMePaR/)) {
         // connect to previous p
                    element.content = element.content.replace(/\s*\+\+\+saMePaR\s*/,"");
  console.log("               about to push-", element.content, "-as", items_so_far, "(m1) on",  this_new_content);
 console.log("specifically item",items_so_far - 1,"which is", this_new_content[items_so_far - 1]);
               //     this_new_content[items_so_far - 1].content.push(element.content)
                    this_new_content[items_so_far - 1].content.push({tag: "text", content: element.content})
                  } else if (typeof element.content == "string") {
         // simple p, not connected
// console.log("is this the wrong case?", element);
                    this_new_content.push({...element})
// console.log("now this_new_content", this_new_content);
// alert("pause");
                  } else if (element.content.length > 0 && element.content[0].tag == "text"
                                && typeof element.content[0].content == "string"
                                && element.content[0].content.match(/\s*\+\+\+saMePaR/)) {
         // also connect to previous p, but we have multiple items to connect
                    element.content[0].content = element.content[0].content.replace(/\s*\+\+\+saMePaR\s*/,"");
// console.log("               now element.content[0].content is", element.content[0].content);
                    element.content.forEach( (el) => { this_new_content[items_so_far - 1].content.push(el) });
                  } else if (element.content.length > 0) {
         // not connected
                    this_new_content.push({...element})
                  } else {
                       // empty list, so throw it away
                  }
                } else if (element.tag == "text") {
// console.log("found text", element.content);   // this can't happen":  see hack below
                    element.content = element.content.replace(/\s*\+\+\+saMePaR\s*/,"");
                } else {  // some other element, so just save it
                    this_new_content.push({...element})
                }
            }

            this_content.content = [...this_new_content]

          } else if (action == "absorb math"  && this_content.tag == "text" ) {  // silly hack because of reprocessing
              this_content.content = this_content.content.replace(/\s*\+\+\+saMePaR\s*/,"");

          } else if (action == "ppp"  && (this_content.tag == "p" || this_content.tag == "li" )) {
              if (typeof this_content.content == "string") {
                  this_content.content = this_content.content.replace(/^( *\n)*/, "");
                  this_content.content = this_content.content.replace(/( *\n)*$/, "");
              } else {
                  this_content.content.forEach( (element) => {
                      if (element.tag == "text" || display_math_tags.includes(element.tag)) {
                        element.content = element.content.replace(/^( *\n)*/, "");
                        element.content = element.content.replace(/( *\n)*$/, "");
                      }
                  } );
              }
          }    // last of many special transformations

// console.log("past the special trans", action, "xx", this_content);

          let this_node = {...this_content};
// console.log("now re-extracting", this_node.content);
          this_node.content = extract_lists(this_node.content, action, thisdepth+1, maxdepth, tags_to_process, this_node.tag, parent_tag);

          return this_node

    } else {

      if (false && typeof this_content != "string") { console.log("what is it", this_content);  alert("non-object non-string: ", this_content) }

//console.log("this_tag", this_tag, tags_to_process.includes(this_tag));
      if (action == "do_nothing") { return this_content + "X"}

      else if (action == "fonts" && tags_to_process.includes(parent_tag)) {  // note: this_content already known
                                                                          // to be a string
        return texFonts(this_content)

      } else if (action == "texlike" && tags_to_process.includes(parent_tag)) {  // note: this_content already known
                                                                          // to be a string
// console.log("texlike", this_content);

        return texLike(this_content);

      } else { return this_content }
    }

    return newnodelist

}

export const preprocess = function(just_text) {

    let originaltextX = just_text;

  // non-structural LaTeX (make into a separate function )
    originaltextX = originaltextX.replace(/\\smallskip/g, "\n");
    originaltextX = originaltextX.replace(/\\medskip/g, "\n");
    originaltextX = originaltextX.replace(/\[resume\]/g, "\n");

  // Is there any case where trailing spaces (before the \n) are meaningful?
    originaltextX = originaltextX.replace(/ +(\n|$)/g, "\n");

    // Make self closing tags "tight"
    originaltextX = originaltextX.replace(/\s*\/>/g, "/>");

    originaltextX = preprocessAliases(originaltextX);

   // XML comments (can these be something else, such as in Tikz?
    originaltextX = originaltextX.replace(/<!--/g, "\\begin{comment}");
    originaltextX = originaltextX.replace(/-->/g, "\\end{comment}");

   // things like {equation*} -> {equation*}
    originaltextX = originaltextX.replace(/{([a-z]{3,})\*/g,"{$1star");
    originaltextX = originaltextX.replace(/section\*/g,"section");

      tags_with_weird_labels.forEach( (tag) => {
          const regex = new RegExp(
              "(\\\\begin{" + tag + "})(.*?)(\\\\end{" + tag + "})", "sg"
          );
          originaltextX = originaltextX.replace(regex, function(x,y,z,w) {
// console.log("found a ", tag);
              if (z.match(/\\label\s*{/)) {   // }
                  const the_full_label = z.replace(/^(.*?)(\s*\\label{[^{}]*}\s*)(.*)$/s, "$2");
                  const all_but_the_label = z.replace(/^(.*?)(\\label{[^{}]*}\s*)(.*)$/s, "$1$3");
                  return y + the_full_label + all_but_the_label + w
              } else { return y + z + w }
          });

      });

   // put latex-style labels on a new line
      let originaltextA = originaltextX.replace(/([^\s])\\label({|\[|\()/g,"$1\n\\label$2");   // }

   // have to preprocess blockquote because (of how we handle attributes) the starting > looks
   // like the end of an opening tag.
      let originaltextB = originaltextA.replace(/\n\s*\n\s*>/g, "\n\n+++sTaRTbQ>");  // preprocess blockquote

   // the questionable way we recognize paragraphs
   // to do: use a list of math modes
   //        make sure \[...\] works
      originaltextB = originaltextB.replace(/\n *\\\[([^\[\]]+)\\\] *\n/sg, "\n\\begin{equationstar}$1\\end{equationstar}\n");  // old LaTeX
      originaltextB = originaltextB.replace(/(\$\$|\\end{equation}|\\end{align}|\\end{equationstar}|\\end{alignstar}) *\n([^\s])/g, "$1\n+++saMePaR$2");  // should take "equation" and "align" from a list
      originaltextB = originaltextB.replace(/(\/me>|\/md>|\/men>|\/mdn>) *\n *([^\n<])/g, "$1\n+++saMePaR$2");  // should take "equation" and "align" from a list

   // PTX makes the questionable choice of wrapping liss in a p.
   // Note that this will make a syntax error if handed:
   //      <p><ol>...</ol>words</p>
      originaltextB = originaltextB.replace(/<p>\s*(<ol>|<ul>|<dl>)/g, "$1");
      originaltextB = originaltextB.replace(/(<\/ol>|<\/ul>|<\/dl>)\s*<\/p>/g, "$1");

   // LaTeX does not require blank lines between \\item s, so add those blanks
      originaltextB = originaltextB.replace(/\s*?\n+\s*?\\item\s+/g, "\n\n\\item ");

   // `definition` in prefigure means something different, to hide it as `predefinition`
      let originaltextC = originaltextB.replace(/(<diagram)(.*?)(<\/diagram>)/sg, function(x,y,z,w) {
                                  const hiddenz = z.replace(/(<|<\/)definition(>)/g, "$1predefinition$2");
                                  return y + hiddenz + w
                              });

   // put attributes on the next line
      const findattributes = new RegExp("([^\\n])(\\n *(" + possibleattributes.join("|") + ") *:)", "g");
      originaltextC = originaltextC.replace(findattributes, "$1\n$2");

// console.log("originaltextC", originaltextC);
// alert("x");

    return originaltextC

}

export const extractStructure = function(doc) {

    let this_text = doc;

// console.log("documentstyle?", this_text.match(/document(style|class)/));

    if (this_text.match(/document(style|class)/)) {
//  console.log("found full LaTeX document")
        // need to extract some metadata

//        // delete % comments
//        this_text = this_text.replace(/%.*/g, "");

        let preamble = this_text.replace(/\\begin{document}.*$/s, "");
        document_metadata["preamble"] = preamble;

        document_metadata["documentclass"] = "article";  // to fix:  detect, not assume

        let the_doc = this_text.replace(/^.*\\begin{document}(.*)\\end{document}.*/s, "$1");

        let the_metadata = the_doc.replace(/\\maketitle.*$/s, "");
        document_metadata["metadata"] = the_metadata;

        if (the_metadata.match(/\\title\s*/)) {
          let titlepart = the_metadata.replace(/^.*\\title\s*/s, "");
          if (titlepart.startsWith("[")) {  // \]
              let shorttitle = titlepart.replace(/^\[(.*?)\]\s*{(.*?)}.*$/s, "$1");
              document_metadata["shorttitle"] = shorttitle;
              let title = titlepart.replace(/^\[(.*?)\]\s*{(.*?)}.*$/s, "$2");
              document_metadata["title"] =  title;
          } else if (titlepart.startsWith("{")) {   // }
              let title = titlepart.replace(/^{(.*?)}.*$/s, "$1");
              document_metadata["title"] =  title
          } else {
              alert("had trouble extracting title")
          }
        } else {
          alert("Did not find title")
        }

        let the_body = the_doc.replace(/^.*\\maketitle/s, "");

        const body_and_biblio = the_body.split("\\begin{thebibliography}");

        if (body_and_biblio.length == 2) {
            the_body = body_and_biblio[0];
            document_metadata["biblio"] = body_and_biblio[1];
        }

//  console.log("the_body", the_body);
//  alert("extracted structure");
        return the_body
    }

//  console.log("this_text", this_text);
//  alert("did not extract structure");
    return doc

}

export const setCoarseStructure = function(doc) {

    let this_text = doc;

// Some Markdown adaptations:
    this_text = this_text.replace(/(^|\n)# +([A-Z][^\n]*)\n/g,"$1\\section{$2}");
    this_text = this_text.replace(/(^|\n)## +([A-Z].*)\n/g,"$1\\subsection{$2}");
    this_text = this_text.replace(/(^|\n)### +([A-Z].*)\n/g,"$1\\paragraphs{$2}");

//  A Markdown hrule is no structural, so remove
//  (note:this kills multiline-style MD headings)
    this_text = this_text.replace(/^ *-{2,} *\n/,"\n");
    this_text = this_text.replace(/\n *\n *-{2,} *\n *\n/g,"\n\n");

// RMarkdown images.  First, no caption case
    this_text = this_text.replace(/\n *\n *\!\[\]\(([^()]+)\){([^{}]+)} *\n *\n/g,"\n\n\\includegraphics[$2]{$1}\n\n");
// The caption case?  Need an example first

// url links
    this_text = this_text.replace(/\[([^\[\]]*)\]\((http[^()]+)\)/g, "\\url{$2}{$1}");

    if (true || markdownMode) {
        this_text = this_text.replace(/\n *\n *```/g,"\n\n\\begin{sage}\n");
        this_text = this_text.replace(/\n```({r)/g,"\n\n\\begin{sage}\n$1");
        this_text = this_text.replace(/``` *\n *\n/g,"\\end{sage}\n\n");
    }


// console.log("this_text",this_text);
// alert("this_text");

    this_text = splitOnStructure(this_text, "section");
    this_text = splitOnStructure(this_text, "subsection");
    this_text = splitOnStructure(this_text, "paragraphs");

    return this_text;

}

const splitOnStructure = function(doc, marker, depth=0, maxdepth=2) {

// console.log("document_metadata", document_metadata);
    if (depth > maxdepth) { return doc }

    if (Array.isArray(doc)) {
        let newdoc = [...doc];
        newdoc.forEach( (element) => {
            const new_content = splitOnStructure(element.content, marker, depth+1, maxdepth);
            if (typeof new_content == "string") {
                // do nothing, because was no substructure, right?
            } else {
                element.content = [...splitOnStructure(new_content, marker, depth+1, maxdepth)]
            }

        });
        return newdoc
    } else {
        let newdoc = doc;
// for now, assume pure LaTeX
//         const thesedelimiters = [PreTeXtDelimiterOfAttributes(marker)];

    //    newdoc = splitTextAtDelimiters(newdoc, thesedelimiters, depth+1, maxdepth);

//  console.log("marker", marker);
        const re = new RegExp("\\\\(" + marker + ")", "g");
//console.log("re", re);
        let this_doc_sections = newdoc.split(re);

//        console.log(this_doc_sections.length, "this_doc_sections", this_doc_sections);
        if (this_doc_sections.length == 1) {
//            console.log("did not find any ", marker);
            return this_doc_sections[0]
        }

        let text_reassembled = [];
        let current_section = {};
        let looking_for_section = true;
        let looking_for_title = false;
        let looking_for_content = false;  // wrong, because title and content are in one entry.
        let this_label = "";

        this_doc_sections.forEach(  (element, index) => {
          let element_trimmed = element.trim();
// console.log("element", element_trimmed);

          if (looking_for_section) {
            if (!element_trimmed) { return } // ie, next iteration

            if (element != marker) {
                if (index == 0) { // should be an introduction
                    current_section["tag"] = "introduction";
                    current_section["content"] = element;
                    //  still looking for marker, which should be next element
                    text_reassembled.push({...current_section});
                    current_section = {}
                } else {
                    alert("did not find " + marker + ":" + element + "X")
                }
            }
            else {
              current_section["tag"] = marker;
              looking_for_section = false;
              looking_for_title = true;
            }

          } else if (looking_for_title) {
              element_trimmed = element.trim();
              if (element_trimmed.startsWith("{")) {   // }
// console.log("looking for title in", element_trimmed.substring(0,40) + "UU");
                let [this_title, this_content] = firstBracketedString(element_trimmed);

//                const this_title = element_trimmed.replace(/^{(.*?)} *\n+(.*)$/s, "$1");
//                let this_content = element_trimmed.replace(/^{(.*?)} *\n+(.*)$/s, "$2");
                current_section["title"] = this_title.slice(1,-1);
// console.log("found title",this_title, "in", this_content.substring(0,40) + "XX");

                if (this_content.match(/^\s*\\label/)) {
                    this_content = this_content.replace(/^\s*\\label\s*/, "");
                    [this_label, this_content] = firstBracketedString(this_content);
                    this_label = this_label.slice(1,-1);
     //               const this_label = this_content.replace(/^\s*\\label\s*{(.*?)}(.*)$/s, "$1");
     //               this_content = this_content.replace(/^\s*\\label\s*{(.*?)}(.*)$/s, "$2");
                    if (this_label) {current_section["id"] = sanitizeXMLattributes(this_label)}
                }
                current_section["content"] = this_content.trim();
                looking_for_title = false;
                looking_for_section = true;
// console.log("current_section", current_section);
                text_reassembled.push({...current_section});
                current_section = {}
              }
 //up to here
          }

        });

        if (Object.keys(current_section).length) {
            console.log("current_section",current_section);
            alert("some content was not saved")
        }

// console.log(text_reassembled);
// alert("this_text_sections");
        return text_reassembled

    }
}
