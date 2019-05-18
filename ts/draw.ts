/// <reference path="util.ts" />
namespace MathMemo{
declare var MathJax:any;
var capture: any = null

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


class Handle {
    circle : SVGCircleElement;
    handle_move:any;
    down_point: Point|null = null;

    constructor(pt:Point, handle_move:any= null){
        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.circle.setAttribute("r", "4");
        this.circle.setAttribute("fill", "blue");
        this.circle.addEventListener("pointerdown", this.pointerdown);
        this.circle.addEventListener("pointermove", this.pointermove);
        this.circle.addEventListener("pointerup", this.pointerup);

        this.circle.style.cursor = "move";

        this.set_pos(pt);
    
        svg.appendChild(this.circle);

        this.handle_move = handle_move;
    }

    set_pos(pt:Point){
        this.circle.setAttribute("cx", "" + pt.x);
        this.circle.setAttribute("cy", "" + pt.y);
    }

    pointerdown =(ev: PointerEvent)=>{
        capture = this;
        this.down_point = new Point(ev.offsetX, ev.offsetY);
        this.circle.setPointerCapture(ev.pointerId);
        console.log("handle pointer down");
    }

    pointermove =(ev: PointerEvent)=>{
        if(capture != this){
            return;
        }
        console.log("handle pointer move");

        var pt = new Point(ev.offsetX, ev.offsetY);
        this.set_pos(pt);

        if(this.handle_move != null){
            this.handle_move(this, ev, pt);
        }
    }

    pointerup =(ev: PointerEvent)=>{
        console.log("handle pointer up");

        this.circle.releasePointerCapture(ev.pointerId);
        capture = null;
        this.down_point = null;

        var pt = new Point(ev.offsetX, ev.offsetY);
        this.set_pos(pt);
    }
    
}

class LineSegment extends Tool {    
    points : Array<Point> = [];
    line : SVGLineElement;
    handles : Handle[] = [];

    constructor(){
        super();
        this.line = document.createElementNS("http://www.w3.org/2000/svg","line");
    }

    handle_move =(handle: Handle, ev:PointerEvent, pt: Point)=>{
        var idx = this.handles.indexOf(handle);
        if(idx == 0){

            this.line.setAttribute("x1", "" + pt.x);
            this.line.setAttribute("y1", "" + pt.y);
        }
        else{

            this.line.setAttribute("x2", "" + pt.x);
            this.line.setAttribute("y2", "" + pt.y);
        }
    }

    click(pt:Point): void {
        this.handles.push( new Handle(pt, this.handle_move) );

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
    handles : Handle[] = [];

    constructor(){
        super();
        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
    }

    set_point(idx: number, pt: Point){

    }

    handle_move =(handle: Handle, ev:PointerEvent, pt: Point)=>{
        var idx = this.handles.indexOf(handle);
        
        var old_pt = this.points[idx];
        this.points[idx] = pt;

        if(idx == 0){

            this.circle.setAttribute("cx", "" + pt.x);
            this.circle.setAttribute("cy", "" + pt.y);

            this.points[1].x += pt.x - old_pt.x;
            this.points[1].y += pt.y - old_pt.y;

            this.handles[1].set_pos(this.points[1]);
        }
        else{

            var r = this.points[0].dist(pt);
            this.circle!.setAttribute("r", "" +  r );
        }
    }

    click(pt:Point): void{
        if(this.points.length == 0){

            this.circle.setAttribute("cx", "" + pt.x);
            this.circle.setAttribute("cy", "" + pt.y);
            this.circle.setAttribute("r", "1");
            this.circle.setAttribute("fill", "transparent");
            this.circle.setAttribute("stroke", "navy");
            this.circle.setAttribute("stroke-width", "3px");
        
            svg.appendChild(this.circle);    
        }
        else{
            var r = this.points[0].dist(pt);
            this.circle!.setAttribute("r", "" +  r );
    
            tool = null;
        }

        this.points.push(pt);
    
        this.handles.push( new Handle(pt, this.handle_move) );
    }

    mousemove(pt:Point) : void{
        var r = this.points[0].dist(pt);
        this.circle!.setAttribute("r", "" +  r );
    }
}


class Triangle extends Tool {
    points : Array<Point> = [];
    lines : Array<SVGLineElement> = [];
    handles : Handle[] = [];

    constructor(){
        super();
    }

    handle_move =(handle: Handle, ev:PointerEvent, pt: Point)=>{
        var idx = this.handles.indexOf(handle);
        this.lines[idx].setAttribute("x1", "" + pt.x);
        this.lines[idx].setAttribute("y1", "" + pt.y);

        var idx2 = (idx + 2) % 3;
        this.lines[idx2].setAttribute("x2", "" + pt.x);
        this.lines[idx2].setAttribute("y2", "" + pt.y);
    }

    click(pt:Point): void {
        this.handles.push( new Handle(pt, this.handle_move) );

        if(this.lines.length != 0){

            var last_line = array_last(this.lines);
            last_line.setAttribute("x2", "" + pt.x);
            last_line.setAttribute("y2", "" + pt.y);
        }           

        var line = document.createElementNS("http://www.w3.org/2000/svg","line");

        line.setAttribute("stroke", "navy");
        line.setAttribute("stroke-width", "3px");

        line.setAttribute("x1", "" + pt.x);
        line.setAttribute("y1", "" + pt.y);

        if(this.lines.length != 2){
            line.setAttribute("x2", "" + pt.x);
            line.setAttribute("y2", "" + pt.y);
        }
        else{
            line.setAttribute("x2", "" + this.points[0].x);
            line.setAttribute("y2", "" + this.points[0].y);
    
            tool = null;
        }    

        svg.appendChild(line);

        this.lines.push(line);
        this.points.push(pt);        
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
        var rc = self.div!.getBoundingClientRect();
        self.rect.setAttribute("width", `${rc.width}`);
        self.rect.setAttribute("height", `${rc.height}`);
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

    click(pt:Point) : void {
        this.down_point = pt;

        this.rect.setAttribute("x", "" + pt.x);
        this.rect.setAttribute("y", "" + pt.y);
        this.rect.setAttribute("width", "1");
        this.rect.setAttribute("height", "1");
        this.rect.setAttribute("fill", "transparent");
        this.rect.setAttribute("stroke", "navy");

        svg.appendChild(this.rect);

        var rc = svg.getBoundingClientRect() as DOMRect;

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.left  = `${window.scrollX + rc.x + pt.x}px`;
        this.div.style.top   = `${window.scrollY + rc.y + pt.y}px`;
        this.div.style.backgroundColor = "cornsilk"
        document.body.appendChild(this.div);

        TextBox.dialog.showModal();
        tool = null;
    }
}

var tool : Tool | null = null;

function tool_click(){
    tool_type = (document.querySelector('input[name="tool-type"]:checked') as HTMLInputElement).value;  
}

function svg_click(ev: MouseEvent){
    if(capture != null){
        return;
    }
    var pt = new Point(ev.offsetX, ev.offsetY);
    console.log(`svg click ${pt.x} ${pt.y}`);

    if(tool != null){

        tool.click(pt);
    }
}

function svg_mousedown(ev: MouseEvent){
    if(capture != null){
        return;
    }

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
    if(capture != null){
        return;
    }

    if(tool != null){
        var pt = new Point(ev.offsetX, ev.offsetY);
        tool.mouseup(pt);
    }
}

function svg_mousemove(ev: MouseEvent){
    if(capture != null){
        return;
    }

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