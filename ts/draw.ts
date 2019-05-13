/// <reference path="util.ts" />
namespace MathMemo{
declare var MathJax:any;

var property_div : HTMLDivElement;

class Path {
}

class Point {
    x: number;
    y: number;
    constructor(x:number, y: number){
        this.x = x;
        this.y = y;
    }

    dist(pt:Point){
        var dx = pt.x - this.x;
        var dy = pt.y - this.y;

        return Math.sqrt(dx * dx + dy * dy);
    }
}

function OrderPoints(p1:Point, p2:Point){
    var pt1 = new Point(p1.x, p1.y);
    var pt2 = new Point(p2.x, p2.y);

    if(pt2.x < pt1.x){
        var tmp = pt1.x;
        pt1.x = pt2.x;
        pt2.x = tmp;
    }

    if(pt2.y < pt1.y){
        var tmp = pt1.y;
        pt1.y = pt2.y;
        pt2.y = tmp;
    }

    return [pt1, pt2];
}

var svg : SVGSVGElement;
var tool_type = "line-segment";

abstract class Tool {
    click(pt:Point): void {}
    mousedown(pt:Point) : void {}
    mousemove(pt:Point) : void {}
    mouseup(pt:Point) : void {}
    show_property():void {}
}

class LineSegment extends Tool {
    points : Array<Point> = [];
    line : SVGLineElement;

    constructor(){
        super();
        this.line = document.createElementNS("http://www.w3.org/2000/svg","line");
    }

    click(pt:Point): void {
        add_point(pt);

        if(this.points.length == 0){

            this.line.setAttribute("x1", "" + pt.x);
            this.line.setAttribute("y1", "" + pt.y);
            this.line.setAttribute("x2", "" + pt.x);
            this.line.setAttribute("y2", "" + pt.y);
            this.line.setAttribute("stroke", "navy");
            this.line.setAttribute("stroke-width", "3px");
        
            svg.appendChild(this.line);
    
            this.points.push(pt);
        }
        else{
            tool = null;
        }    
    }

    mousemove(pt:Point) : void {
        this.line!.setAttribute("x2", "" + pt.x);
        this.line!.setAttribute("y2", "" + pt.y);
    }
}

class Circle extends Tool {
    points : Array<Point> = [];
    circle: SVGCircleElement;

    constructor(){
        super();
        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
    }

    click(pt:Point): void{
        add_point(pt);

        if(this.points.length == 0){

            this.circle.setAttribute("cx", "" + pt.x);
            this.circle.setAttribute("cy", "" + pt.y);
            this.circle.setAttribute("r", "1");
            this.circle.setAttribute("fill", "transparent");
            this.circle.setAttribute("stroke", "navy");
            this.circle.setAttribute("stroke-width", "3px");
        
            svg.appendChild(this.circle);
    
            this.points.push(pt);
        }
        else{
            var r = this.points[0].dist(pt);
            this.circle!.setAttribute("r", "" +  r );
    
            tool = null;
        }
    
    }

    mousemove(pt:Point) : void{
        var r = this.points[0].dist(pt);
        this.circle!.setAttribute("r", "" +  r );
    }
}


class Triangle extends Tool {
    points : Array<Point> = [];
    lines : Array<SVGLineElement> = [];

    constructor(){
        super();
    }

    click(pt:Point): void {
        add_point(pt);

        var line = document.createElementNS("http://www.w3.org/2000/svg","line");

        line.setAttribute("x2", "" + pt.x);
        line.setAttribute("y2", "" + pt.y);
        line.setAttribute("stroke", "navy");
        line.setAttribute("stroke-width", "3px");

        svg.appendChild(line);

        this.lines.push(line);
        this.points.push(pt);

        if(this.lines.length == 0){
            line.setAttribute("x1", "" + pt.x);
            line.setAttribute("y1", "" + pt.y);

        }
        else{

            var last_line = array_last(this.lines);
            last_line.setAttribute("x2", "" + pt.x);
            last_line.setAttribute("y2", "" + pt.y);

            var last_point = array_last(this.points);
            line.setAttribute("x1", "" + last_point.x);
            line.setAttribute("y1", "" + last_point.y);

            if(this.lines.length == 3){

                var line2 = document.createElementNS("http://www.w3.org/2000/svg","line");

                line2.setAttribute("x1", "" + pt.x);
                line2.setAttribute("y1", "" + pt.y);
                line2.setAttribute("x2", "" + this.points[0].x);
                line2.setAttribute("y2", "" + this.points[0].y);
                line2.setAttribute("stroke", "navy");
                line2.setAttribute("stroke-width", "3px");

                svg.appendChild(line2);
        
                tool = null;
            }    
        }    
    }

    mousemove(pt:Point) : void {
        var last_line = array_last(this.lines);
        last_line.setAttribute("x2", "" + pt.x);
        last_line.setAttribute("y2", "" + pt.y);
    }
}

class TextBox extends Tool {
    static dialog : HTMLDialogElement;
    static text_box : TextBox;    
    down_point : Point | null = null;
    rect   : SVGRectElement;
    div : HTMLDivElement | null = null;
    x : number = 0;
    y  : number = 0;
    width : number = 0;
    height : number = 0;

    static ontypeset(self: TextBox){
        var width, height;
        [width, height] = get_size(self.div!);

        width += 2 * padding;
        height += 2 * padding;

        self.div!.style.width  = width + "px";
        self.div!.style.height = height + "px";
    
        self.rect.setAttribute("width", `${width}`);
        self.rect.setAttribute("height", `${height}`);
    }

    static ok_click(){
        var text = (document.getElementById("text-box-text") as HTMLTextAreaElement).value;
        TextBox.text_box.div!.innerHTML = make_html_lines(text);
        TextBox.dialog.close();
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
        MathJax.Hub.Queue([TextBox.ontypeset, TextBox.text_box]);
    }

    static init(){
        TextBox.dialog = document.getElementById('text-box-dlg') as HTMLDialogElement;
        (document.getElementById("text-box-ok") as HTMLInputElement).addEventListener("click", TextBox.ok_click)
    }

    constructor(){
        super();
        TextBox.text_box = this;
        this.rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
    }

    set_pos(pt:Point){
        var pts = OrderPoints(this.down_point!, pt);

        this.x = pts[0].x;
        this.y = pts[0].y;
        this.width  = pts[1].x - pts[0].x;
        this.height = pts[1].y - pts[0].y;

        this.rect.setAttribute("x", "" + this.x);
        this.rect.setAttribute("y", "" + this.y);
        this.rect.setAttribute("width", `${this.width}`);
        this.rect.setAttribute("height", `${this.height}`);
    }

    mousedown(pt:Point) : void {
        this.down_point = pt;

        this.rect.setAttribute("x", "" + pt.x);
        this.rect.setAttribute("y", "" + pt.y);
        this.rect.setAttribute("width", "1");
        this.rect.setAttribute("height", "1");
        this.rect.setAttribute("fill", "transparent");
        this.rect.setAttribute("stroke", "navy");

        svg.appendChild(this.rect);
    }

    mousemove(pt:Point) : void {
        this.set_pos(pt);
    }

    mouseup(pt:Point) : void {
        this.set_pos(pt);

        var rc = svg.getBoundingClientRect() as DOMRect;
        console.log(`${rc} ${window.scrollY}`);

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.left  = `${window.scrollX + rc.x + this.x}px`;
        this.div.style.top   = `${window.scrollY + rc.y + this.y}px`;
        this.div.style.width  = `${this.width}px`;
        this.div.style.height = `${this.height}px`;
        this.div.style.backgroundColor = "cornsilk"
        document.body.appendChild(this.div);

        TextBox.dialog.showModal();
        this.show_property();
        tool = null;
    }

    show_property():void {
        property_div.innerHTML = "";

        var span = document.createElement("span");

    }


}

var tool : Tool | null = null;

function tool_click(){
    tool_type = (document.querySelector('input[name="tool-type"]:checked') as HTMLInputElement).value;  
}

function add_point(pt:Point){
    var c = document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx", "" + pt.x);
    c.setAttribute("cy", "" + pt.y);
    c.setAttribute("r", "4");
    c.setAttribute("fill", "blue");

    svg.appendChild(c);
}

function svg_click(ev: MouseEvent){
    var pt = new Point(ev.offsetX, ev.offsetY);
    console.log(`svg click ${pt.x} ${pt.y}`);

    if(tool != null){

        tool.click(pt);
    }
}

function svg_mousedown(ev: MouseEvent){
    var pt = new Point(ev.offsetX, ev.offsetY);
    console.log(`svg mouse down ${pt.x} ${pt.y}`);

    if(tool == null){
        switch(tool_type){
            case "line-segment":
            tool = new LineSegment();
            break;
    
            case "circle":    
            tool = new Circle();
            break;
    
            case "triangle":
            tool = new Triangle();
            break;

            case "text-box":
            tool = new TextBox();
            break;
        } 
    }

    if(tool != null){
        tool.mousedown(pt);
    }
}

function svg_mouseup(ev: MouseEvent){
    if(tool != null){
        var pt = new Point(ev.offsetX, ev.offsetY);
        tool.mouseup(pt);
    }
}

function svg_mousemove(ev: MouseEvent){
    if(tool != null){
        var pt = new Point(ev.offsetX, ev.offsetY);
        tool.mousemove(pt);
    }
}

export function text_box_ok_click(){

}

export function init_draw(){
    property_div = document.getElementById("property-div") as HTMLDivElement;

    // var svg = document.getElementsByTagNameNS("http://www.w3.org/2000/svg","svg")[0]
    svg = document.getElementById("main-svg") as unknown as SVGSVGElement;
    svg.addEventListener("click", svg_click);
    svg.addEventListener("mousedown", svg_mousedown);
    svg.addEventListener("mousemove", svg_mousemove);
    svg.addEventListener("mouseup"  , svg_mouseup);

    TextBox.init();

    var tool_types = document.getElementsByName("tool-type");
    for(let x of tool_types){
        x.addEventListener("click", tool_click);
    }
}

}