/// <reference path="main.ts" />
namespace MathMemo{
declare var MathJax:any;
declare var dagre:any;

var padding = 10;
var clicked = false; 
var from_block : TextBlock | null = null;
export var dom_list : (HTMLElement | SVGSVGElement)[] = [];


function add_node_rect(svg1: SVGSVGElement, nd: any, block: TextBlock){
    var rc = document.createElementNS("http://www.w3.org/2000/svg","rect");
    rc.setAttribute("x", "" + (nd.x - nd.width/2));
    rc.setAttribute("y", "" + (nd.y - nd.height/2));
    rc.setAttribute("width", nd.width);
    rc.setAttribute("height", nd.height);
    rc.setAttribute("fill", "cornsilk");
    if(block.link == null){

        rc.setAttribute("stroke", "green");
    }
    else{

        rc.setAttribute("stroke", "blue");
    }
    svg1.appendChild(rc);
}

function onclick_edge(temp: [TextBlock, TextBlock]) {

    return function(){
        (window.event as MouseEvent).stopPropagation();

        var blc1 = temp[0];
        var blc2 = temp[1];

        var input_idx = blc2.input_src_ids().indexOf(blc1.id);
        console.assert(input_idx != -1);
        cur_edge = blc2.inputs[input_idx];

        if (clicked) {
            clicked = false;

            console.log("double click!! " + (click_cnt++) + " " + temp);
            blc2.inputs.splice(input_idx, 1);

            // block_text.value = temp.lines.join("\n");
    
            show_doc(cur_doc);

            return;
        }
    
        clicked = true;
        setTimeout(function () {
            if (clicked) {
                console.log("single click! " + (click_cnt++));
                edge_label_input.value = cur_edge!.label;
            }
    
            clicked = false;
        }, 300);
    }
}

function add_edge(svg1: SVGSVGElement, block1: TextBlock, block2: TextBlock, ed: any){
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
    path.setAttribute("stroke", "red");
    path.setAttribute("stroke-width", "3px");
    path.setAttribute("d", d);

    path.addEventListener("click", (onclick_edge([block1, block2])));

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

function onclick_block(temp: TextBlock) {

    return function(){
        var ev = window.event as KeyboardEvent;

        ev.stopPropagation();

        if(ev.ctrlKey){

            if(from_block == null){

                msg("接続先のブロックをクリックしてください。");
                from_block = temp;
            }
            else{

                if(temp.input_src_ids().includes(from_block.id)){

                    msg("接続済みです。");
                }
                else{

                    msg("ブロックを接続しました。" + from_block.id + "->" + temp.id);
                    temp.inputs.push(new Edge(from_block.id, temp.id, ""));
                }
                from_block = null;

                show_doc(cur_doc);
            }
        }
        else{

            console.log("click block " + (click_cnt++));
            cur_block = temp;
            block_text.value = cur_block.lines.join("\n");
        }
    }
}

function ontypeset(id_blocks: OrderedMap<string, TextBlock>, svg1: SVGSVGElement){
    // Create a new directed graph 
    var g = new dagre.graphlib.Graph();

    // Set an object for the graph label
    g.setGraph({});

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function() { return {}; });

    for(let blc of id_blocks.values()){
        var width, height;
        [width, height] = get_size(blc.ele!);
        blc.ele!.style.width  = (width + 2 * padding) + "px";
        blc.ele!.style.height = (height + 2 * padding) + "px";

        g.setNode(blc.id,    { width: width + 2 * padding, height: height + 2 * padding });   // label: ele.id,  

        for(let id of blc.input_src_ids()){

            g.setEdge(id, blc.id);
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

        var block = id_blocks.get(id);
        var ele = block.ele!;
    
        ele.style.position = "absolute";
        ele.style.left = `${window.scrollX + rc1.x + nd.x - nd.width /2 + padding}px`
        ele.style.top  = `${window.scrollY + rc1.y + nd.y - nd.height/2 + padding}px`

        ele.addEventListener("click", (onclick_block(block)));
            
        add_node_rect(svg1, nd, block);
    });


    g.edges().forEach(function(edge_id:any) {
        var blc1 = id_blocks.get(edge_id["v"]);
        var blc2 = id_blocks.get(edge_id["w"]);

        var ed = g.edge(edge_id);
        add_edge(svg1, blc1, blc2, ed);
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