function graph_closure(){
    var parser;

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

    var id_cnt = 0;
    
    
    function read_file(path, fnc){
        // 読み込み開始
        $.ajax({ 
            type: 'GET',
            url: path,
            dataType: 'text'
        })
        .then(
            function(doc) { 
                // 読み込みに成功した時
                fnc(doc);
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
    
    function add_node(parent, nd){
        var rc = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rc.setAttribute("x", nd.x - nd.width/2);
        rc.setAttribute("y", nd.y - nd.height/2);
        rc.setAttribute("width", nd.width);
        rc.setAttribute("height", nd.height);
        rc.setAttribute("fill", "none");
        rc.setAttribute("stroke", "green");
        parent.appendChild(rc);
    
        if(nd.label == undefined){
            return;
        }
    
        var text = document.createElementNS("http://www.w3.org/2000/svg","text");
        text.setAttribute("x", nd.x);
        text.setAttribute("y", nd.y);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "20");
        text.setAttribute("dominant-baseline", "middle");
    
        text.textContent = nd.label;
    
        parent.appendChild(text);
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
            console.log("class:" + span.className + " w:" + rc.width);
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
    
    function ontypeset(id_blocks, svg1, text_blocks){
        for(let block of text_blocks){
            var w, h;
            [w, h] = get_size(block.ele);
        
            block.ele.style.width  = w + "px";
            block.ele.style.height = h + "px";
        }
    
        // Create a new directed graph 
        var g = new dagre.graphlib.Graph();
    
        // Set an object for the graph label
        g.setGraph({});
    
        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(function() { return {}; });
    
        for(let blc of id_blocks.values()){
            var width, height;
            [width, height] = get_size(blc.ele);
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
    
            add_node(svg1, nd);
        });
    
    
        g.edges().forEach(function(e) {
            var ed = g.edge(e);
            add_edge(svg1, ed);
        });         
    }
    
    class TextBlock {
        constructor(){
            this.lines = [];
            this.from = [];
        }

        make(){
            this.ele = document.createElement("div");
            this.ele.innerHTML = this.lines.join("\n");
            this.ele.id = this.id;
            parser.id_blocks.set(this.id, this);
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
            this.text_blocks = [];
        }
    
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
            this.text_blocks.push(block);
                    
            if(this.current_line_trim.startsWith("id:")){
                block.id = this.current_line_trim.substring(3).trim();
                this.get_next_line();
            }
            else{
                block.id = "#" + id_cnt;

                id_cnt++;
            }
            
            if(this.current_line_trim.startsWith("from:")){
                var s = this.current_line_trim.substring(5).split(",");
                block.from = s.map(x => x.trim());
                
                this.get_next_line();
            }

            var in_math = false;
            var ul_indent = -1;
            var indent, line;
            while(this.current_line_trim != "}"){
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

                        if(line.startsWith("* ")){
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

                            block.lines.push(tab(indent + 1) + "<span>" + line + "</span><br/>")
                        }
                    }
                }
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
            var conditions = [];
            
            this.skip_empty_line();
            while(true){
                var block;
                if(this.next_line == "{"){
                    this.get_next_line("{");    
                    block = this.parse_imply(nest + 1);

                    this.get_next_line("}");    
                }
                else{

                    block = this.parse_text(nest + 1);
                }
                conditions.push(block);    

                if(this.current_line_trim != "&"){

                    break;
                }
                this.get_next_line("&");    
            }

            if(this.current_line_trim == "->"){
                while(this.current_line_trim == "->"){

                    this.get_next_line("->");
                    var block = this.parse_text(nest + 1);
    
                    console.assert(block.id != undefined);
                    block.conditions = conditions;
                    block.from = block.from.concat(Array.from(block.conditions.map(x => x.id)));
                    console.log(block.from);

                    conditions = [ block ];
                }

                return block;
            }
            else{

                console.assert(conditions.length == 1);
                return conditions[0];
            }
        }
    
        parse(){
            while(this.current_line != null){
                this.skip_empty_line();
                console.assert(this.current_line.startsWith("----------"));
                this.get_next_line();

                var svg1 = document.createElementNS("http://www.w3.org/2000/svg","svg");
                svg1.style.backgroundColor = "wheat";
                document.body.appendChild(svg1);
    
                this.id_blocks = new OrderedMap();
                var text_blocks = [];
                while(this.current_line != null && ! this.current_line.startsWith("----------")){
        
                    this.parse_imply(0);
                    this.skip_empty_line();

                    for(let block of this.text_blocks){
                        block.make();
                    }
                    Array.prototype.push.apply(text_blocks, this.text_blocks);
                    this.text_blocks = [];
                }
        
                MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
                MathJax.Hub.Queue([ontypeset, this.id_blocks, svg1, text_blocks]);

                document.body.appendChild(document.createElement("hr"));
            }
        }
    }

    class LogicGraph{

        init(path){
            read_file(path, this.make_graph);            
        }

        make_graph(text){
            parser = new Parser(text);
            parser.parse();
        }
    
    }

    return new LogicGraph();
}
