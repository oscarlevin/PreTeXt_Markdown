
import {
    outputtags,
    structural_components,
    level_1_p_peers_containing_p,
    other_level_1_p_peers,
    list_like,
    inlinetags,
    randomtags_containing_p,
    containers,
    display_environments,
    display_subenvironments,
    display_subsubenvironments,
    possibleattributes,
    objects_with_substructure,
    display_math_tags,
    level,
    paragraph_peers,
    attribute_like,
    asymmetric_inline_delimiters,
    tags_containing_text,
    tags_containing_paragraphs,
    tags_needing_statements,
    tagofmarker,
} from './data.js'
import {preprocess, setCoarseStructure, extractStructure, splitIntoParagraphs, splitAtDelimiters, extract_lists, convertTextInPlace } from './mysplitAtDelimiters.js'
import {reassemblePreTeXt} from './reassemble.js'
import { alert } from './utils.js';

// console.log("in parse.js");

export let document_metadata = {};

export function fmToPTX(originaltext, wrapper="placeholder"){  // called by index.js

    let originaltextA = preprocess(originaltext);
// console.log("originaltextA", originaltextA);
// alert("originaltextA");

// names of these functions are confusing
    let originaltextB = extractStructure(originaltextA);
      //console.log("originaltextB", originaltextB);
    let originaltextC = setCoarseStructure(originaltextB);

//console.log("outputtags", outputtags);
//  console.log("originaltextC", originaltextC);
      // wrap everything in a section
      let tmp1together = {tag: wrapper, content: originaltextC}

      if ("documentclass" in document_metadata && document_metadata["documentclass"]) {
          tmp1together["tag"] = document_metadata["documentclass"]
      } else { tmp1together["tag"] = wrapper }  // ? wrapper ?

      if ("title" in document_metadata && document_metadata["title"]) {
          tmp1together["title"] = document_metadata["title"]
      } else if ("shorttitle" in document_metadata && document_metadata["shorttitle"]) {
          tmp1together["title"] = document_metadata["shorttitle"]
      }


      let new1 = {...tmp1together};

// console.log("starting iteration on new1", new1);
// alert("new1");
      const firstdepth =  20;
      for (let depth = 0; depth < firstdepth; ++depth) {
          let trimmed_levels = level    //  currently not trimming level.slice(depth);      // need to actually trim them!
          trimmed_levels.forEach( (lev) => {
              new1 = splitAtDelimiters(new1, lev, 0, depth)
              attribute_like.forEach( (attr) => { new1 = extract_lists(new1, attr[0], 0, depth, attr[1]) } );

          } );
      }
//   console.log("preprocessed text 2", new1);
//  alert("preprocessed text 2");

      let new7 = {...new1}
// console.log("about to process new7", new7);
// alert("7");
      new7 = splitAtDelimiters(new7, ["comment"], 0, 10);
      new7 = splitIntoParagraphs(new7, "all", paragraph_peers);
    console.log("processed text 7", new7);
//         alert("pause 2");
      let new8 = {...new7}
      new8 = extract_lists(new8, "oneline environments", 0,0, "all");
//  console.log("new8", new8);
//  alert("new8")
      new8 = extract_lists(new8, "attributes", 0,0, "all");
//  console.log("new8a", new8);
//  alert("new8a")
//  console.log("processed text 8", new8);
//       alert("pause 3");

      attribute_like.forEach( (attr) => { new8 = extract_lists(new8, attr[0], 0, 0, attr[1]) } );
// console.log("processed text 8b", new8);
//      alert("pause 3");
  // next is maybe overkill, but things like statements contain p's
      new8 = splitIntoParagraphs(new8, "all", paragraph_peers);

      new8 = extract_lists(new8, "blockquotes", 0,0,["p"]);  // meaning: Markdown style

      new8 = extract_lists(new8, "images",0,0, "all");

//      new8 = splitAtDelimiters(new8, ["sage"],0,10);    // why 10?

      let new9 = {...new8};

// console.log("new9", new9);
// alert("new9")
      new9 = extract_lists(new9, "extract li", 0,0, "all");   // "all" is wrong, but later code assumes "p"
// console.log("new9b", new9);
// alert("new9b")

      attribute_like.forEach( (attr) => { new9 = extract_lists(new9, attr[0], 0, 0, attr[1]) } );
////////////////////      var tmp1secondsplitPfig = extract_lists(tmp1secondsplitP, "substructure", objects_with_substructure);

//  console.log("about to clean up substructure", new9);
//       alert("pause 3");
  // next is maybe overkill, but things like statements contain p's
      new9 = extract_lists(new9, "clean up substructure", 0,0,objects_with_substructure);


      const tmp5t = new9;
      const tmp5w = extract_lists(tmp5t, "extract li",0,0, ["p"]);
//  console.log("tmp5w", tmp5w);
//  alert("tmp5w");
      let tmp5v = extract_lists(tmp5w, "gather li",0,0, tags_containing_paragraphs);
      tmp5v = extract_lists(tmp5v, "split li",0,0, ["ol", "ul"]);
//  console.log("tmp5v", tmp5v);
//  alert("tmp5v");
      const tmp5u = extract_lists(tmp5v, "absorb math",0,0, tags_containing_paragraphs, "", "", wrapper);
// console.log("tmp5u", tmp5u);
//  console.log("tmp5u", tmp5u);
//  alert("tmp5u");



      const tmp2 = splitAtDelimiters(tmp5u, asymmetric_inline_delimiters, 0,firstdepth+1, "all", tags_containing_text);
//      const tmp2 = splitAtDelimiters(new9, asymmetric_inline_delimiters, 0,firstdepth+1, "all", tags_containing_text);

      const tmp3 = splitAtDelimiters(tmp2, "spacelike", 0,firstdepth+1, "all", tags_containing_text);

      //have to do this twice, because of nesting
      const tmp4x = splitAtDelimiters(tmp3, asymmetric_inline_delimiters,0,firstdepth+1, "all", tags_containing_text);
      const tmp4 = splitAtDelimiters(tmp4x, asymmetric_inline_delimiters, 0,firstdepth+1,"all", tags_containing_text);

//  console.log("tmp4", tmp4);
//  alert("tmp4");
      const tmp5x = extract_lists(tmp4, "fonts", 0,0,tags_containing_text);
//  console.log("tmp5x", tmp5x);
//  alert("tmp5x");
      const tmp5y = extract_lists(tmp5x, "texlike", 0,0,tags_containing_text);

      let tmp5z = splitAtDelimiters(tmp5y, "spacelike", 0,firstdepth+1, "all", tags_containing_text);

      tmp5z = splitAtDelimiters(tmp5z, asymmetric_inline_delimiters,0,firstdepth+1, "all", tags_containing_text);
      tmp5z = splitAtDelimiters(tmp5z, asymmetric_inline_delimiters, 0,firstdepth+1,"all", tags_containing_text);


/*
      const tmp5t = tmp5z;
      const tmp5w = extract_lists(tmp5t, "extract li",0,0, ["p"]);
//  console.log("tmp5w", tmp5w);
//  alert("tmp5w");
      const tmp5v = extract_lists(tmp5w, "gather li",0,0, tags_containing_paragraphs);
      tmp5v = extract_lists(tmp5v, "split li",0,0, ["li"]);
//  console.log("tmp5v", tmp5v);
//  alert("tmp5v");
      const tmp5u = extract_lists(tmp5v, "absorb math",0,0, tags_containing_paragraphs, "", "", wrapper);
// console.log("tmp5u", tmp5u);
//  alert("tmp5u");
*/

// console.log("tmp5z", tmp5z);
//  alert("tmp5z");


      let tmp5s = extract_lists(tmp5z, "statements",0,0, tags_needing_statements);  // statemetns now part of level
//  console.log("tmp5s", tmp5s);
//   alert("tmp5s");
//      let tmp5r = extract_lists(tmp5s, "images",0,0, "all");
      let tmp5r = tmp5s;
      let tmp5 = extract_lists(tmp5r, "prefigure",0,0, ["prefigure"]);
      tmp5 = extract_lists(tmp5, "sage",0,0, ["sage"]);
      tmp5 = extract_lists(tmp5, "ppp",0,0, []);
 //     let tmp5 = tmp5u;

      if ("biblio" in document_metadata) {
          let the_biblio = {tag: "backmatter"};
          the_biblio.content = '\n<references xml:id="bibliography">\n<title>Bibliography</title>\n';
          the_biblio.content += processBiblio(document_metadata["biblio"]);
          the_biblio.content += "\n</references>\n";
          tmp5.content.push(the_biblio)
      }


//       console.log("tmp2 again",tmp2 );
//       console.log("tmp4",tmp4 );
      console.log("tmp5",tmp5 );
// alert("the end");
      const tmp5p = reassemblePreTeXt(tmp5);

      return tmp5p
};

//////////////

export function splitLI(anOLUL, depth=0, listsofar=[], marker="") {

//console.log("splitLI", anOLUL);
   if (anOLUL.content.length > 1) { return anOLUL }

   let theLI = anOLUL.content[0];
console.log("theLI", theLI);
   let theLIcontent = anOLUL.content[0].content;
console.log("theLIcontent", theLIcontent,"X");

   if (typeof theLIcontent == "string" && theLIcontent.match(/\n *(\-|\+|\*|[0-9])/)) {
//       console.log("need to split li:", theLIcontent);
       let split_li = theLIcontent.split(/\n *(\-|\+|\*|[0-9]\.*)/);
       if (split_li < 3) { alert("malformed list items", theLIcontent) }
//       console.log("split_li", split_li);
//console.log("the anOLUL.content[0].content was", anOLUL.content[0]);
       anOLUL.content[0].content = split_li.shift();
//console.log("the anOLUL.content[0].content is", anOLUL.content[0]);

//console.log(split_li.length,"split_li.length", split_li);
       while (split_li.length > 0) {
           let next_marker = split_li.shift();
           if (next_marker.match(/^[0-9]/)) { next_marker = "1" }
           const next_contents = split_li.shift().trim();
//console.log("found", tagofmarker[next_marker], "compared to", theLI._parenttag);
           if (tagofmarker[next_marker] == theLI._parenttag) {
               let new_li = {tag: "li", _parenttag: tagofmarker[next_marker], content: next_contents};
               anOLUL.content.push(new_li)
           } else { // need to start a sublist
             let new_sublist = { tag: tagofmarker[next_marker], content: [] }
             new_sublist.content.push({tag:"li", content:next_contents, _parenttag:tagofmarker[next_marker] });
             while (split_li.length > 0 && tagofmarker[split_li[0]] == tagofmarker[next_marker] ) {
               let sublist_marker = split_li.shift();
               if (sublist_marker.match(/^[0-9]/)) { sublist_marker = "1" }
               const next_sublist_contents = split_li.shift();
               new_sublist.content.push({tag:"li", content:next_sublist_contents, _parenttag:tagofmarker[sublist_marker] });
             }
             let old_last_li = anOLUL.content.pop();
//             console.log("addlig list under", old_last_li);
             let old_last_li_content = old_last_li.content;
             let old_last_li_new_content = [{tag: "p", content: old_last_li_content}];
             old_last_li.content = old_last_li_new_content;
             old_last_li.content.push(new_sublist);

             anOLUL.content.push(old_last_li)
           }
       }

   } else {
       console.log("will not be splitting:", theLIcontent);
       return anOLUL
   }

   return anOLUL
}

//////////////

function processBiblio(latexbib) {

   let thetext = latexbib.trim();

   thetext = thetext.replace(/{[^{}]+}/, "");
   thetext = thetext.replace(/\s*\\(begin|end){thebibliography}\s*/, "");
   thetext = thetext.replace(/%.*/g, "");

   thetext = convertTextInPlace(thetext);
   thetext = thetext.replace(/&([^m])/, "&amp;$1");

  // quick and dirty: go back and split it up and reprocess separately
   thetext = thetext.replace(/\s*\\bibitem\s*{([^{}]+)}\s*/g, '</biblio>\n\n<biblio type="raw" xml:id="$1">');
   thetext = thetext.replace(/(.*?)<\/biblio>/, "");
   thetext += "</biblio>\n";

   return thetext

}

//////////////

// not used yet
function processTable(tab) {

   let thetext = tab;

   thetext = thetext.replace(/&([^a-zA-Z])/, "&amp;");

   return thetext

}


