/// <reference path="main.ts" />
namespace MathMemo{
declare var MathJax:any;
declare var dagre:any;

var padding = 10;
export var dom_list : (HTMLElement | SVGSVGElement)[] = [];

function get_indent(line: string) : [number, string]{
    var indent = 0;
    while(true){
        if(line.startsWith("\t")){
            indent++;
            line = line.substring(1);    
        }
        else if(line.startsWith("    ")){
            indent++;
            line = line.substring(4);
        }
        else{
            return [indent, line];
        }
    }
}

function tab(indent: number){
    return " ".repeat(4 * indent);
}

export function make_html_lines(text: string){
    var lines = text.split('\n');
    var html_lines = [];            

    var in_math = false;
    var ul_indent = -1;
    var prev_line = "";
    for(let current_line of lines){
        var current_line_trim = current_line.trim();

        let [indent, line] = get_indent(current_line);
        indent--;

        if(current_line_trim == "$$"){
            in_math = ! in_math;
            html_lines.push(current_line);
        }
        else{
            if(in_math){

                html_lines.push(current_line);
            }
            else{

                if(line.startsWith("# ")){
                    html_lines.push(tab(indent + 1) + "<strong><span>" + line.substring(2) + "</span></strong><br/>")
                }
                else if(line.startsWith("- ")){
                    if(ul_indent < indent){
                        console.assert(ul_indent + 1 == indent);
                        html_lines.push(tab(indent) + "<ul>")
                        ul_indent++;
                    }
                    else{
                        while(ul_indent > indent){
                            html_lines.push(tab(ul_indent) + "</ul>")
                            ul_indent--;
                        }                            
                    }
                    html_lines.push(tab(indent + 1) + "<li><span>" + line.substring(2) + "</span></li>")
                }
                else{

                    if(prev_line.endsWith("</li>")){
                        html_lines[html_lines.length - 1] = prev_line.substring(0, prev_line.length - 5) + "<br/>";
                        html_lines.push(tab(indent + 1) + "<span>" + line + "</span></li>")
                    }
                    else{

                        html_lines.push(tab(indent + 1) + "<span>" + line + "</span><br/>")
                    }
                }
            }
        }

        prev_line = html_lines[html_lines.length - 1];
    }

    while(ul_indent != -1){
        html_lines.push(tab(ul_indent) + "</ul>")
        ul_indent--;
    }

    return html_lines.join("\n");
}

function add_node_rect(svg1: SVGSVGElement, nd: any, block: TextBlock|null, edge: Edge|null){
    var rc = document.createElementNS("http://www.w3.org/2000/svg","rect");
    rc.setAttribute("x", "" + (nd.x - nd.width/2));
    rc.setAttribute("y", "" + (nd.y - nd.height/2));
    rc.setAttribute("width", nd.width);
    rc.setAttribute("height", nd.height);
    rc.setAttribute("fill", "cornsilk");
    if(block != null){

        if(block.link == null){

            rc.setAttribute("stroke", "green");
        }
        else{
    
            rc.setAttribute("stroke", "blue");
        }
    }
    else{

            rc.setAttribute("stroke", "navy");
    }
    svg1.appendChild(rc);

    return rc;
}


function add_edge(svg1: SVGSVGElement, ed: any){
    var path = document.createElementNS("http://www.w3.org/2000/svg","path");

    var d: string = ""; 

    if(ed.points.length == 2){

        for(let [i, pnt] of ed.points.entries()){
            if(i == 0){
    
                d = `M ${pnt.x},${pnt.y}`;
            }
            else{
    
                d += ` L${pnt.x},${pnt.y}`;
            }
        }
    }
    else{

        for(let [i, pnt] of ed.points.entries()){
            if(i == 0){
    
                d = `M ${pnt.x},${pnt.y} Q`;
            }
            else{
    
                d += ` ${pnt.x},${pnt.y}`;
            }
        }
    }
    path.setAttribute("fill", "transparent");
    path.setAttribute("stroke", "navy");
    path.setAttribute("stroke-width", "3px");
    path.setAttribute("d", d);

    var edge = ed.edge as Edge;
    edge.paths.push(path);

    path.addEventListener("click", edge.onclick_edge);

    svg1.appendChild(path);
}    

function get_size(ele: HTMLDivElement){
    var spans = ele.getElementsByTagName("span");

    var min_x = Number.MAX_VALUE, min_y = Number.MAX_VALUE;
    var max_x = 0, max_y = 0;
    for(let span of spans){
        if(span.className == "MathJax_Preview" || span.className == "MJX_Assistive_MathML MJX_Assistive_MathML_Block"){
            continue;
        }
        var rc = span.getBoundingClientRect();
        // console.log(`${span.className} rc:${rc.x},${rc.y},${rc.width},${rc.height}, ${span.innerText.replace('\n', ' ')}`);
        if(span.className == "MathJax_SVG"){

            max_x = Math.max(max_x, rc.width);
        }
        else{

            min_x = Math.min(min_x, rc.left);
            max_x = Math.max(max_x, rc.right);
        }
        min_y = Math.min(min_y, rc.top);
        max_y = Math.max(max_y, rc.bottom);
    }
    if(min_x == Number.MAX_VALUE){
        min_x = 0;
    }

    return [max_x - min_x, max_y - min_y]
}

function make_node(g: any, ele: HTMLDivElement, id:string, block: TextBlock|null, edge: Edge|null){
    var width, height;
    [width, height] = get_size(ele);
    ele!.style.width  = (width + 2 * padding) + "px";
    ele!.style.height = (height + 2 * padding) + "px";

    g.setNode(id, { ele: ele, block: block, edge: edge, width: width + 2 * padding, height: height + 2 * padding });   // label: ele.id,  
}

function ontypeset(id_blocks: OrderedMap<string, TextBlock>, svg1: SVGSVGElement){
    // Create a new directed graph 
    var g = new dagre.graphlib.Graph();

    // Set an object for the graph label
    g.setGraph({});

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function() { return {}; });

    for(let blc of id_blocks.values()){
        make_node(g, blc.ele!, "" + blc.id, blc, null);

        for(let edge of blc.inputs){

            edge.rect = null;
            edge.paths = [];

            if(edge.label == ""){

                g.setEdge(edge.src_id, blc.id, { edge: edge });
            }
            else{

                console.assert(edge.dst_id == blc.id);
                var label_id = `${edge.src_id}-${edge.dst_id}`
                g.setEdge(edge.src_id, label_id, { edge: edge });
                make_node(g, edge.label_ele!, label_id, null, edge);
                g.setEdge(label_id, edge.dst_id, { edge: edge });
            }
        }
    }

    dagre.layout(g);
    
    var max_x = 0, max_y = 0;
    g.nodes().forEach(function(id:string) {
        var nd = g.node(id);
        max_x = Math.max(max_x, nd.x + nd.width / 2);
        max_y = Math.max(max_y, nd.y + nd.height/ 2);
    });

    svg1.style.width  = max_x + "px";
    svg1.style.height = max_y + "px";


    var rc1 = svg1.getBoundingClientRect() as DOMRect;
    g.nodes().forEach(function(id:string) {
        var nd = g.node(id);

        var ele = nd.ele as HTMLDivElement;
    
        ele.style.position = "absolute";
        ele.style.left = `${window.scrollX + rc1.x + nd.x - nd.width /2 + padding}px`
        ele.style.top  = `${window.scrollY + rc1.y + nd.y - nd.height/2 + padding}px`
            
        var rc = add_node_rect(svg1, nd, nd.block, nd.edge);
        if(nd.block != null){

            nd.block.rect = rc;
        }
        else{
            (nd.edge as Edge).rect = rc;
        }
    });


    g.edges().forEach(function(edge_id:any) {
        var ed = g.edge(edge_id);
        add_edge(svg1, ed);
    });         

    logic_graph.pending = false;
}

function clear_dom(){
    for(let dom of dom_list){
        dom.parentNode!.removeChild(dom);
    }
    dom_list = [];
}

export function show_doc(doc: Doc){
    doc.check();
    clear_dom();

    doc_title_text.value = cur_doc.title;

    var svg1 = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg1.style.backgroundColor = "wheat";
    svg1.style.width = "1px";
    svg1.style.height = "1px";
    svg1.addEventListener("click", function(){
        console.log("SVG clicked " + (click_cnt++));
    })
    document.body.appendChild(svg1);

    var id_blocks = new OrderedMap();

    for(let block of doc.blocks){

        id_blocks.set(block.id, block);

        block.make();
    }

    MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
    MathJax.Hub.Queue([ontypeset, id_blocks, svg1]);

    dom_list.push(svg1);
}

}