declare var dagre:any;
declare var MathJax:any;
declare var firebase:any;

export default function graph_closure(){

    class Doc {
        id: number;
        title : string;
        blocks : TextBlock[];

        constructor(id: number, title: string, blocks: TextBlock[]){
            this.id = id;
            this.title = title;
            this.blocks = blocks;
        }
    }

    var block_text : HTMLTextAreaElement = document.getElementById("block-text") as HTMLTextAreaElement;
    var msg_text : HTMLSpanElement = document.getElementById("msg-text") as HTMLSpanElement;
    var doc_title_text: HTMLInputElement = document.getElementById("doc-title") as HTMLInputElement;
    var edge_label_input = document.getElementById("edge-label") as HTMLInputElement;
    var docs_select: HTMLSelectElement = document.getElementById("docs-select") as HTMLSelectElement;
    var menu_span = document.getElementById("menu-span") as HTMLSpanElement;

    var click_cnt = 0;   

    var cur_doc = new Doc(0, "", [] );
    var cur_block : TextBlock | null = null;
    var cur_edge  : Edge | null = null;
    var clicked = false; 
    var from_block : TextBlock | null = null;
    var dom_list : (HTMLElement | SVGSVGElement)[] = [];
    var timeout_id : number | null = null;

    var sys_inf: any = { "ver": 4 };

    doc_title_text.addEventListener("blur", function(){
        cur_doc.title = doc_title_text.value.trim();

        console.assert(docs_select.selectedIndex != -1);
        console.assert(logic_graph.docs[docs_select.selectedIndex] === cur_doc);

        var opt = docs_select.selectedOptions[0];
        opt.text = cur_doc.title;
    });

    document.body.addEventListener("click", function(){
        console.log("body clicked " + (click_cnt++));
    });

    block_text.addEventListener("keypress", function(){
        if((window.event as KeyboardEvent).code == "Enter" && (window.event as KeyboardEvent).ctrlKey == true){
    
            var lines = block_text.value.split("\n");
            block_text.value = "";
    
            new TextBlock(cur_doc, [], lines, null);

            logic_graph.show_doc(cur_doc);
        }
    });

    block_text.addEventListener("blur", function(){
        if(cur_block != null){
            if(cur_block.lines.join("\n") != block_text.value){
                // ブロックのテキストが変わった場合

                cur_block.lines = block_text.value.split('\n');

                logic_graph.show_doc(cur_doc);
            }

            cur_block = null;
            block_text.value = "";
        }
    });

    edge_label_input.addEventListener("blur", function(){
        if(cur_edge == null){
            return;
        }
        cur_edge.label = edge_label_input.value.trim();

        logic_graph.show_doc(cur_doc);
    });

    docs_select.addEventListener("change", function(){

        var idx = docs_select.selectedIndex;
        if(idx == -1){
            return;
        }
        
        cur_doc = logic_graph.docs[idx];

        logic_graph.show_doc(cur_doc);
    });

    function make_span(text: string){
        var span = document.createElement("span");
        span.innerHTML = text;
        return span;        
    }

    function make_button(label: string, fnc: any){
        var btn = document.createElement("button");
        btn.innerHTML = label;
        btn.addEventListener("click", fnc);

        return btn;
    }

    function make_sub_menu(parent: HTMLElement, label:string, sub_menu: any[]){
        parent.appendChild( make_span(label) );

        var ul = document.createElement("ul");
        ul.className = "popup";
        for(let [label, fnc] of sub_menu){
            var li = document.createElement("li");
            if(Array.isArray(fnc)){

                make_sub_menu(li, label, fnc);
            }
            else{

                li.appendChild( make_button(label, fnc) );
            }
            
            ul.appendChild(li);
        }
        parent.appendChild( ul );
    }

    function show_menu(ev:MouseEvent, label:string, menu_defs: [string, any][]){
        var dlg = document.createElement("dialog") as HTMLDialogElement;
        dlg.style.position = "absolute";
        dlg.style.left = ev.x + "px";
        dlg.style.top  = ev.y + "px";
        dlg.addEventListener("click", ()=>dlg.close());

        make_sub_menu(dlg, label, menu_defs);

        document.body.appendChild(dlg);
        dlg.showModal();
    }

    menu_span.addEventListener("contextmenu", function(ev){
        ev.preventDefault();
        console.log(ev);

        var docs_menu : [string, any][] = [];

        for(let doc of logic_graph.docs){

            var fnc = function (x) {
                return function() {
                    console.log(x.title);
                    new TextBlock(cur_doc, [], [x.title], doc.id);
                    logic_graph.show_doc(cur_doc);
                };
            }(doc);

            docs_menu.push([ doc.title, fnc ]);
        }

        show_menu(ev, "メニュー", [
            [ "コピー", docs_menu ], 
            ["ファイル", ()=>{ console.log("ファイル"); }],
            ["編集", ()=>{ console.log("編集"); }],
            ["表示", ()=>{ console.log("表示"); }],
        ]);
    });


    function msg(txt : string){
        if(timeout_id != null){
            clearTimeout(timeout_id);
        }

        msg_text.innerHTML = txt;

        timeout_id = setTimeout(function(txt1){
            return function(){
                msg_text.innerHTML = "";
                timeout_id = null;
            }
        }(txt), 3000);
    }

    function clear_dom(){
        for(let dom of dom_list){
            dom.parentNode!.removeChild(dom);
        }
        dom_list = [];
    }

    function restore_doc(doc_obj:any) : Doc {
        var doc = new Doc(parseInt(doc_obj.id, 10), doc_obj.title, []);

        var block_objs = JSON.parse(doc_obj.blocks_str);

        for(let [i, blc] of block_objs.entries()){
            console.assert("#" + i == blc.id);

            var inputs = blc.inputs.map((x:any) => new Edge(x.src_id, x.dst_id, x.label));
            new TextBlock(doc, inputs, blc.lines, (blc.link == undefined ? null : blc.link));
        }

        return doc;
    }

    function stringify_doc(doc: Doc){
        var block_objs = doc.blocks.map(blc => blc.to_json());
        
        var blocks_str = JSON.stringify(block_objs);

        if(doc.title == undefined){

            return { "id": doc.id, "blocks_str": blocks_str };
        }
        else{

            return { "id": doc.id, "title": doc.title, "blocks_str": blocks_str };
        }
    }
    
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

    class OrderedMap<K, V> {
        map: any;
        keys: K[];
        constructor(){
            this.map = new Map();
            this.keys = [];
        }
    
        set(key: K, value: V){
            if(! this.map.has(key)){
                this.keys.push(key);
            }
            this.map.set(key, value);
        }
    
        get(key: K) : V {
            return this.map.get(key);
        }
    
        has(key: K) : boolean {
            return this.map.has(key);
        }
    
        values() : V[] {
            return this.keys.map(x => this.map.get(x) as V);
        }
    }    
    
    var padding = 10;
    
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

    function onclick_path(temp: [TextBlock, TextBlock]) {

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
        
                logic_graph.show_doc(cur_doc);

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

        path.addEventListener("click", (onclick_path([block1, block2])));

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

                    logic_graph.show_doc(cur_doc);
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

    class Edge {
        src_id: string;
        dst_id: string;
        label: string;

        constructor(src_id: string, dst_id: string, label: string){
            this.src_id = src_id;
            this.dst_id = dst_id;
            this.label = label;
        }

        to_json(){
            return { "src_id": this.src_id, "dst_id": this.dst_id, "label": this.label };
        }
    }
    
    class TextBlock {
        parent: any;
        id: string;
        inputs: Edge[];
        lines: string[];
        link : number | null;
        ele: HTMLDivElement | null;
        
        constructor(parent: Doc, inputs: Edge[], lines: string[], link: number | null){
            this.parent = parent;
            this.id = "#" + parent.blocks.length;
            this.inputs = inputs;
            this.lines = lines;
            this.link = link;
            this.ele = null;

            parent.blocks.push(this);
        }

        to_json(){
            return { "id": this.id, "inputs": this.inputs.map(x => x.to_json()), "lines": this.lines, "link": this.link}
        }

        input_src_ids(){
            return this.inputs.map(x => x.src_id);
        }

        make_html_lines(){
            var html_lines = [];            

            var in_math = false;
            var ul_indent = -1;
            var prev_line = "";
            for(let current_line of this.lines){
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

            return html_lines;
        }

        /*
            HTML要素を作る。
        */
        make(){
            var html_lines = this.make_html_lines();

            this.ele = document.createElement("div");
            this.ele.innerHTML = html_lines.join("\n");
            this.ele.id = this.id;
            document.body.appendChild(this.ele);
            
            var br = document.createElement("br");
            document.body.appendChild(br);

            dom_list.push(this.ele);
            dom_list.push(br);
        }
    }

    class LogicGraph{
        pending: boolean;
        docs: Doc[];
        user: any;

        constructor(){
            this.pending = false;
            this.docs = [];
            this.user = null;
        }

        new_doc(){
            var max_id = Math.max(... this.docs.map(x => x.id));
            cur_doc = new Doc(max_id + 1, "タイトル", []);

            new TextBlock(cur_doc, [], ["テキスト"], null);

            this.docs.push(cur_doc);

            var opt = document.createElement("option");
            opt.text = cur_doc.title;
            docs_select.appendChild(opt);
            docs_select.selectedIndex = docs_select.options.length - 1;
    
            logic_graph.show_doc(cur_doc);    
        }

        show_doc(doc: Doc){
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

        read_docs(){
            while (docs_select.options.length > 0) {                
                docs_select.remove(0);
            }

            this.docs = [];
            db.collection('users-' + sys_inf.ver ).doc(this.user.uid).collection('docs')
            .get().then((querySnapshot: any) => {
                querySnapshot.forEach((data:any) => {
                    var doc = restore_doc(data.data());

                    this.docs.push(doc);                    
                });

                this.docs.sort((a,b) => a.id - b.id );
                for(let doc of this.docs){
                    var opt = document.createElement("option");
                    if(doc.title == undefined){

                        opt.text = "???";
                    }
                    else{

                        opt.text = doc.title;
                    }
                    docs_select.appendChild(opt);
                }
                console.log("rcv doc 終わり", this.docs);
            });            
        }

        save_docs(){

            if(this.user == null){
                msg("ログインしていません。");
            }

            var next_ver = (sys_inf.ver + 1) % 10;
            for(let doc of this.docs){
                var doc_ref = db.collection('users-' + next_ver).doc(this.user.uid).collection('docs').doc("" + doc.id);

                var doc_str = stringify_doc(doc);
                doc_ref.set(doc_str)
                .then(function() {
                    console.log("Document written");
                })
                .catch(function(error: any) {
                    console.error("Error adding document: ", error);
                });
            }

            var sys_ref = db.collection('sys').doc("0");
            sys_ref.set({ "ver": next_ver })
            .then(function() {
                console.log("SYS inf written: " + next_ver);
            })
            .catch(function(error: any) {
                console.error("Error adding SYS inf: ", error);
            });
        }
    }

    var db = firebase.firestore();

    db.collection('sys').doc("0").get()
    .then(function(obj:any) {
        if (obj.exists) {
            sys_inf = obj.data();
            console.log("SYS inf:" + sys_inf.ver);
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
        }
    })
    .catch(function(error:any) {
        console.log("Error getting sys-inf:", error);
    });    

    firebase.auth().onAuthStateChanged(function(user: any) {
        if (user) {
            // User is signed in.
            console.log(`ログイン ${user.uid}`);

            logic_graph.user = user;

            var user1 = firebase.auth().currentUser;

            if (user1) {
                // User is signed in.
                console.log(user1);
            } 
            else {
                // No user is signed in.
                console.log("ログアウト");
            }

        } else {
            // User is signed out.
            // ...
            console.log("ログアウト");
        }
    });
    
    var logic_graph : LogicGraph = new LogicGraph();

    return logic_graph;
}
