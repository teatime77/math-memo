function graph_closure(){
    var parser;
    var users_path = "https://asia-northeast1-hip-rig-238101.cloudfunctions.net/api/users";

    function db_opr(fnc_url, action, payload, fnc){
        $.ajax({
            url : fnc_url,
            type: 'POST',        
            data: { action: action, payload: payload }
        })
        .done( (data_str) => {
            // Ajaxリクエストが成功した時

            var data = JSON.parse(data_str);
            if(fnc != undefined){
                fnc(payload, data);
            }
        })
        .fail( (data) => {
            // Ajaxリクエストが失敗した時

            console.log("err:" + data);
        })
        // Ajaxリクエストが成功・失敗どちらでも発動
        .always( (data) => {
        });
    }

    function restore_doc(doc){
        doc.id = parseInt(doc.id, 10);
        doc.blocks = JSON.parse(doc.blocks_str);
        delete doc.blocks_str;
    }
    
    function get_indent(line){
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

    function tab(indent){
        return " ".repeat(4 * indent);
    }

    class OrderedMap {
        constructor(){
            this.map = new Map();
            this.keys = [];
        }
    
        set(key, value){
            if(! this.map.has(key)){
                this.keys.push(key);
            }
            this.map.set(key, value);
        }
    
        get(key){
            return this.map.get(key);
        }
    
        has(key){
            return this.map.has(key);
        }
    
        values(){
            return this.keys.map(x => this.map.get(x));
        }
    }

    var doc_cnt = 0;
    var id_cnt = 0;
    
    var read_file_pending;
    var read_file_doc;
    function read_file(path){
        read_file_pending = true;
        read_file_doc = null;
        // 読み込み開始
        $.ajax({ 
            type: 'GET',
            url: path,
            dataType: 'text'
        })
        .then(
            function(doc) { 
                // 読み込みに成功した時
                read_file_pending = false;
                read_file_doc = doc;
            },
            function() { 
                //読み込みに失敗した時
                console.log('失敗');
            }
        );
    }
    
    var padding = 10;
    
    function last(v){
        return v[v.length - 1];
    }
    
    function add_node_rect(parent, nd){
        var rc = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rc.setAttribute("x", nd.x - nd.width/2);
        rc.setAttribute("y", nd.y - nd.height/2);
        rc.setAttribute("width", nd.width);
        rc.setAttribute("height", nd.height);
        rc.setAttribute("fill", "none");
        rc.setAttribute("stroke", "green");
        parent.appendChild(rc);
    }
    
    function add_edge(parent, ed){
        var path = document.createElementNS("http://www.w3.org/2000/svg","path");
    
        var d; 
    
        for(let [i, pnt] of ed.points.entries()){
            if(i == 0){
    
                d = `M ${pnt.x},${pnt.y}`;
            }
            else{
    
                d += ` L${pnt.x},${pnt.y}`;
            }
        }
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "red");
        path.setAttribute("d", d);
        parent.appendChild(path);
    }    

    function get_size(ele){
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
    
    function ontypeset(id_blocks, svg1){    
        // Create a new directed graph 
        var g = new dagre.graphlib.Graph();
    
        // Set an object for the graph label
        g.setGraph({});
    
        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(function() { return {}; });
    
        for(let blc of id_blocks.values()){
            var width, height;
            [width, height] = get_size(blc.ele);
            blc.ele.style.width  = (width + 2 * padding) + "px";
            blc.ele.style.height = (height + 2 * padding) + "px";

            g.setNode(blc.id,    { width: width + 2 * padding, height: height + 2 * padding });   // label: ele.id,  

            for(let id of blc.from){

                g.setEdge(id, blc.id);
            }
        }
    
        dagre.layout(g);
        
        var max_x = 0, max_y = 0;
        g.nodes().forEach(function(id) {
            var nd = g.node(id);
            max_x = Math.max(max_x, nd.x + nd.width / 2);
            max_y = Math.max(max_y, nd.y + nd.height/ 2);
        });
    
        svg1.style.width  = max_x + "px";
        svg1.style.height = max_y + "px";
    
    
        var rc1 = svg1.getBoundingClientRect();
        g.nodes().forEach(function(id) {
            var nd = g.node(id);
    
            var ele = id_blocks.get(id).ele;
        
            ele.style.position = "absolute";
            ele.style.left = `${window.scrollX + rc1.x + nd.x - nd.width /2 + padding}px`
            ele.style.top  = `${window.scrollY + rc1.y + nd.y - nd.height/2 + padding}px`
    
            add_node_rect(svg1, nd);
        });
    
    
        g.edges().forEach(function(e) {
            var ed = g.edge(e);
            add_edge(svg1, ed);
        });         

        theGraph.pending = false;
    }
    
    class TextBlock {
        constructor(){
            this.lines = [];
            this.from = [];
        }

        /*
            HTML要素を作る。
        */
        make(html_lines){
            this.ele = document.createElement("div");
            this.ele.innerHTML = html_lines.join("\n");
            this.ele.id = this.id;
            document.body.appendChild(this.ele);
            document.body.appendChild(document.createElement("br"));
        }
    }
    
    class Parser {
        constructor(text){
            this.lines = text.split('\n');
            console.assert(this.lines.length != 0);

            this.current_pos = 0;
            this.get_next_line();
        }
    
        /*
            次行を得る。
        */
        get_next_line(line){
            if(line != undefined){
                console.assert(this.current_line_trim == line);
            }
            this.next_line = null;

            if(this.current_pos < this.lines.length){
    
                this.current_line = this.lines[this.current_pos];
                this.current_line_trim = this.current_line.trim();
                // console.log(this.current_line);
                this.current_pos++;

                if(this.current_pos < this.lines.length){

                    this.next_line = this.lines[this.current_pos];
                }
            }
            else{
                this.current_line = null;
                this.current_line_trim = null;
            }
        }
    
        /*
            空行をスキップする。
        */
        skip_empty_line(line){
            while(this.current_line != null && this.current_line_trim == ""){
                this.get_next_line(line);
            }

            var pos = this.current_pos;
            while(this.next_line != null && this.next_line.trim() == "" && pos < this.lines.length){
                this.next_line = this.lines[pos];
                pos++;
            }
        }
   

        parse_text(nest){
            this.get_next_line("{");

            var block = new TextBlock();
                    
            if(this.current_line_trim.startsWith("id:")){
                block.id = this.current_line_trim.substring(3).trim();
                this.get_next_line();
            }
            else{
                block.id = "#" + id_cnt;

                id_cnt++;
            }
            this.id_blocks.set(block.id, block);
            
            if(this.current_line_trim.startsWith("from:")){
                var s = this.current_line_trim.substring(5).split(",");
                block.from = s.map(x => x.trim());
                
                this.get_next_line();
            }

            var in_math = false;
            var ul_indent = -1;
            var prev_line = "";
            var indent, line;
            block.lines2 = [];
            while(this.current_line_trim != "}"){
                block.lines2.push(this.current_line);
                [indent, line] = get_indent(this.current_line);
                indent -= nest;
                if(this.current_line_trim == "$$"){
                    in_math = ! in_math;
                    block.lines.push(this.current_line);
                }
                else{
                    if(in_math){

                        block.lines.push(this.current_line);
                    }
                    else{

                        if(line.startsWith("# ")){
                            block.lines.push(tab(indent + 1) + "<strong><span>" + line.substring(2) + "</span></strong><br/>")
                        }
                        else if(line.startsWith("- ")){
                            if(ul_indent < indent){
                                console.assert(ul_indent + 1 == indent);
                                block.lines.push(tab(indent) + "<ul>")
                                ul_indent++;
                            }
                            else{
                                while(ul_indent > indent){
                                    block.lines.push(tab(ul_indent) + "</ul>")
                                    ul_indent--;
                                }                            
                            }
                            block.lines.push(tab(indent + 1) + "<li><span>" + line.substring(2) + "</span></li>")
                        }
                        else{

                            if(prev_line.endsWith("</li>")){
                                block.lines[block.lines.length - 1] = prev_line.substring(0, prev_line.length - 5) + "<br/>";
                                block.lines.push(tab(indent + 1) + "<span>" + line + "</span></li>")
                            }
                            else{

                                block.lines.push(tab(indent + 1) + "<span>" + line + "</span><br/>")
                            }
                        }
                    }
                }
                prev_line = block.lines[block.lines.length - 1];
                this.get_next_line();
            }

            while(ul_indent != -1){
                block.lines.push(tab(ul_indent) + "</ul>")
                ul_indent--;
            }

            this.get_next_line("}");

            return block;
        }

        parse_imply(nest){
            var prev_block;
            
            this.skip_empty_line();
            var prev_block = this.parse_text(nest + 1);

            console.assert(this.current_line_trim != "&")

            if(this.current_line_trim == "->"){
                while(this.current_line_trim == "->"){

                    this.get_next_line("->");
                    var block = this.parse_text(nest + 1);
    
                    console.assert(block.id != undefined);
                    block.from.push(prev_block.id);
                    prev_block = block;
                }

                return block;
            }
            else{

                return prev_block;
            }
        }
    
        *parse(){
            while(this.current_line != null){

                while(theGraph.pending){
                    yield;
                }

                theGraph.pending = true;

                this.skip_empty_line();
                console.assert(this.current_line.startsWith("----------"));
                this.get_next_line();

                var svg1 = document.createElementNS("http://www.w3.org/2000/svg","svg");
                svg1.style.backgroundColor = "wheat";
                document.body.appendChild(svg1);
    
                this.id_blocks = new OrderedMap();
                while(this.current_line != null && ! this.current_line.startsWith("----------")){
        
                    this.parse_imply(0);
                    this.skip_empty_line();
                }
                // console.log(">>>>>>>>>>--------------------------------------------------");
                var blocks = [];
                for(let block of this.id_blocks.values()){
                    blocks.push( { id: block.id, from: block.from, lines: block.lines2 } )
                }
                var doc = { id:doc_cnt, name:("#doc-" + doc_cnt), blocks_str: JSON.stringify(blocks) };
                doc_cnt++;
                db_opr(users_path, "put", doc, function(doc, data){
                    var payload = {id:doc.id}
                    db_opr(users_path, "get", payload, function(payload, data){
                        var doc3 = data.doc;
                        doc3.blocks = JSON.parse(doc3.blocks_str);
                        delete doc3.blocks_str;
                        console.log("get", doc3);
                    });
                });

                // console.log(JSON.stringify(this.id_blocks.values()));
                // console.log("<<<<<<<<<<--------------------------------------------------");

                for(let block of this.id_blocks.values()){
                    block.make(block.lines);
                }
    
                MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
                MathJax.Hub.Queue([ontypeset, this.id_blocks, svg1]);

                document.body.appendChild(document.createElement("hr"));
            }

            while(theGraph.pending){
                yield;
            }
        }
    }

    var theGraph;
    class LogicGraph{

        constructor(){
            db_opr(users_path, "test", { id : 'よろしく', lines : 'こんにちは' });

            theGraph = this;
            this.pending = false;
        }

        *init(path){
            read_file(path);
            while(read_file_pending){
                yield;
            }

            parser = new Parser(read_file_doc);
            var gen_parse = parser.parse();

            while(true){

                var ret = gen_parse.next();
                if(ret.done){
                    break;
                }   
                yield;
            }
        }

        make_html_lines(lines){
            var html_lines = [];            

            var in_math = false;
            var ul_indent = -1;
            var prev_line = "";
            var indent, line;
            for(let current_line of lines){
                var current_line_trim = current_line.trim();

                [indent, line] = get_indent(current_line);
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

        *show_doc(docs){
            for(let doc of docs){
                while(theGraph.pending){
                    yield;
                }

                theGraph.pending = true;

                var svg1 = document.createElementNS("http://www.w3.org/2000/svg","svg");
                svg1.style.backgroundColor = "wheat";
                document.body.appendChild(svg1);

                var id_blocks = new OrderedMap();

                for(let blc of doc.blocks){
                    var block = new TextBlock();

                    block.id = blc.id;
                    block.from = blc.from;
                    block.lines = blc.lines;

                    id_blocks.set(block.id, block);


                    var html_lines = this.make_html_lines(block.lines);
                    block.make(html_lines);
                }

                MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
                MathJax.Hub.Queue([ontypeset, id_blocks, svg1]);

                document.body.appendChild(document.createElement("hr"));
            }
        }

        read_docs(){
            db_opr(users_path, "get-all-docs", {}, (doc, data) => {

                data.docs.map(x => restore_doc(x));
                data.docs.sort((x,y) => x.id - y.id);
                for(let doc of data.docs){
                    console.log(doc)
                }

                var gen_show_doc = this.show_doc(data.docs);
                var timer_id = setInterval(function(){
                    var ret = gen_show_doc.next();
                    if(ret.done){
                        clearInterval(timer_id);
                    }
                },10);                
            });
        }
    }

    return new LogicGraph();
}

function body_onload(){
    var logic_graph = graph_closure();
    logic_graph.read_docs();
}

function body_onload2(){
    console.log("body on-load");

    // はじめてのAjax(jQuery) 2018年版
    //      https://qiita.com/zakiyamaaaaa/items/bdda422db2ccbaea60d9

    var logic_graph = graph_closure();

    var file_names = [ "general_topology", "wasserstein_gan", "lebesgue_integral"];
    var name = file_names.shift();

    var init = logic_graph.init(`data/${name}.txt` + "?" + (new Date()).getTime());
    var timer_id = setInterval(function(){
        var ret = init.next();
        if(ret.done){
            if(file_names.length != 0){

                name = file_names.shift();
                init = logic_graph.init(`data/${name}.txt` + "?" + (new Date()).getTime());
            }
            else{

                clearInterval(timer_id);
            }
        }
    },10);
}
