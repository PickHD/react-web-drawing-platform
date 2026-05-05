import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, RegularPolygon } from 'react-konva';
import { Pencil, Square, Triangle, Download, Undo, Redo, Trash2, MousePointer2 } from 'lucide-react';

export default function App() {
  const [tool, setTool] = useState('pen'); // 'pen', 'rect', 'triangle', 'select'
  const [color, setColor] = useState('#000000');
  
  const [elements, setElements] = useState([]);
  const [currentElement, setCurrentElement] = useState(null);
  
  // History for Undo/Redo
  const [history, setHistory] = useState([[]]);
  const [historyStep, setHistoryStep] = useState(0);

  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  
  // Responsive stage
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveHistory = (newElements) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep === 0) return;
    setHistoryStep(historyStep - 1);
    setElements(history[historyStep - 1]);
  };

  const handleRedo = () => {
    if (historyStep === history.length - 1) return;
    setHistoryStep(historyStep + 1);
    setElements(history[historyStep + 1]);
  };

  const handleClear = () => {
    setElements([]);
    saveHistory([]);
  };

  const handleExport = () => {
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'drawing-canvas.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (e) => {
    if (tool === 'select') return;
    
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    
    setCurrentElement({
      id: crypto.randomUUID(),
      type: tool,
      color: color,
      points: [pos.x, pos.y],
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      radius: 0
    });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || tool === 'select' || !currentElement) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === 'pen') {
      setCurrentElement(prev => ({
        ...prev,
        points: prev.points.concat([point.x, point.y])
      }));
    } else if (tool === 'rect') {
      setCurrentElement(prev => ({
        ...prev,
        width: point.x - prev.x,
        height: point.y - prev.y
      }));
    } else if (tool === 'triangle') {
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      setCurrentElement(prev => ({
        ...prev,
        radius: radius
      }));
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || tool === 'select') return;
    isDrawing.current = false;
    
    if (currentElement) {
      const updatedElements = [...elements, currentElement];
      setElements(updatedElements);
      saveHistory(updatedElements);
      setCurrentElement(null);
    }
  };

  const renderElement = (el, isCurrent) => {
    const props = {
      key: el.id,
      id: el.id,
      stroke: el.color,
      strokeWidth: el.type === 'pen' ? 4 : 3,
      opacity: isCurrent ? 0.7 : 1,
      draggable: tool === 'select' && !isCurrent,
    };

    if (el.type === 'pen') {
      return (
        <Line
          {...props}
          points={el.points}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
        />
      );
    } else if (el.type === 'rect') {
      return (
        <Rect
          {...props}
          x={el.x}
          y={el.y}
          scaleX={el.width < 0 ? -1 : 1}
          scaleY={el.height < 0 ? -1 : 1}
          width={Math.abs(el.width)}
          height={Math.abs(el.height)}
        />
      );
    } else if (el.type === 'triangle') {
      return (
        <RegularPolygon
          {...props}
          x={el.x}
          y={el.y}
          sides={3}
          radius={el.radius}
        />
      );
    }
    return null;
  };

  const cursorStyle = tool === 'select' ? 'cursor-default' : 'cursor-crosshair';

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      {/* Sidebar Toolbar */}
      <div className="w-[80px] min-w-[80px] bg-white border-r border-gray-200 flex flex-col items-center py-6 shadow-sm z-10 gap-6">
        {/* Tools */}
        <div className="flex flex-col gap-3">
          <ToolButton icon={<MousePointer2 size={22} />} isActive={tool === 'select'} onClick={() => setTool('select')} title="Select / Move" />
          <ToolButton icon={<Pencil size={22} />} isActive={tool === 'pen'} onClick={() => setTool('pen')} title="Pen" />
          <ToolButton icon={<Square size={22} />} isActive={tool === 'rect'} onClick={() => setTool('rect')} title="Rectangle" />
          <ToolButton icon={<Triangle size={22} />} isActive={tool === 'triangle'} onClick={() => setTool('triangle')} title="Triangle" />
        </div>

        <div className="w-10 border-b border-gray-200"></div>

        {/* Colors */}
        <div className="flex flex-col gap-3">
          {['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full shadow-sm transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
              title={`Color: ${c}`}
            />
          ))}
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 cursor-pointer rounded overflow-hidden mt-1 border-0 p-0"
            title="Custom Color"
          />
        </div>

        <div className="flex-1"></div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <ActionButton icon={<Undo size={22} />} onClick={handleUndo} disabled={historyStep === 0} title="Undo" />
          <ActionButton icon={<Redo size={22} />} onClick={handleRedo} disabled={historyStep === history.length - 1} title="Redo" />
          <ActionButton icon={<Trash2 size={22} />} onClick={handleClear} title="Clear Canvas" className="text-red-500 hover:bg-red-50 hover:text-red-600" />
          <ActionButton icon={<Download size={22} />} onClick={handleExport} title="Export Image" />
        </div>
      </div>

      {/* Canvas Area */}
      <div className={`flex-1 relative touch-none ${cursorStyle}`} ref={containerRef}>
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          ref={stageRef}
          className="absolute top-0 left-0 bg-white shadow-sm m-4 rounded-xl overflow-hidden border border-gray-200"
          style={{ width: dimensions.width - 32, height: dimensions.height - 32 }}
        >
          <Layer>
            {/* Render committed elements */}
            {elements.map(el => renderElement(el, false))}
            
            {/* Render element currently being drawn */}
            {currentElement && renderElement(currentElement, true)}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

function ToolButton({ icon, isActive, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-3 rounded-xl transition-all duration-200 ease-in-out ${
        isActive ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
    </button>
  );
}

function ActionButton({ icon, onClick, disabled, title, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-3 rounded-xl transition-all duration-200 ease-in-out ${
        disabled ? 'text-gray-300 cursor-not-allowed' : `text-gray-500 hover:bg-gray-100 ${className}`
      }`}
    >
      {icon}
    </button>
  );
}
