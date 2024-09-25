"use client";

import React, { useRef, useState, useEffect, MouseEvent, TouchEvent } from 'react';
import Online from "@/components/Online";
import Controls from "@/components/Controls";
import { Button, Modal, Spinner } from "flowbite-react";
import Image from "next/image";
import { ArrowDownTrayIcon, QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import { useSearchParams } from 'next/navigation'
import Bell from "@/components/Bell";
import { toast } from "sonner";

const DrawingCanvas: React.FC = () => {
    const canvasContainerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const reconnectAttempts = useRef<number>(0);
    const retryTimeout = useRef<NodeJS.Timeout | null>(null);
    const [isInit, setIsInit] = useState<boolean>(false);
    const [tool, setTool] = useState<string>('pencil');
    const [palette, setPalette] = useState<Array<string>>([]);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [startDraggingX, setStartDraggingX] = useState<number>(0);
    const [startDraggingY, setStartDraggingY] = useState<number>(0);
    const [scrollLeft, setScrollLeft] = useState<number>(0);
    const [scrollTop, setScrollTop] = useState<number>(0);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    const [color, setColor] = useState<string>('#ffffff');
    const [range, setRange] = useState<number>(10);
    const [reference, setReference] = useState<boolean>(true);
    const [referenceOpacity, setReferenceOpacity] = useState<number>(0);
    const [width] = useState<number>(3000);
    const [height] = useState<number>(3000);
    const zoom = useRef<number>(25);
    const [maxZoom] = useState<number>(150);
    const [minZoom] = useState<number>(25);
    const [zoomPercent, setZoomPercent] = useState<number>(25);
    const [pinchDistance, setPinchDistance] = useState<number>(0);
    const [online, setOnline] = useState<number>(0);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [viewModal, setViewModal] = useState<boolean>(false);
    const [viewImage, setViewImage] = useState<string>('');
    const [token, setToken] = useState<string>('default');
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token') || 'default';
        setToken(token.replace(/[^a-zA-Z0-9]/g, ''));

        const c = localStorage.getItem('color');
        setColor(c ? c : '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));

        const r = localStorage.getItem('range');
        setRange(r ? parseInt(r) : 10);

        return () => {
            if (retryTimeout.current) {
                clearTimeout(retryTimeout.current);
            }
            if (ws) {
                ws.close();
            }
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = range;
                ctx.lineCap = 'round';
                ctx.strokeStyle = color;
                if (!isInit) {
                    ctx.rect(0, 0, width, height);
                    ctx.fill();
                }
                setContext(ctx);
                if (isInit) {
                    localStorage.setItem('color', color);
                    localStorage.setItem('range', String(range));
                }
            }
        }
    }, [isInit, color, range]);

    useEffect(() => {
        if (context && !ws) {
            connectWebSocket();
        }
    }, [context]);

    const connectWebSocket = () => {
        const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL, token);

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            attemptReconnect();
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'draw') {
                drawCircle(data.endX, data.endY, data.color, data.range);
            }
            if (data.type === 'clear') {
                clearState(false);
            }
            if (data.type === 'save') {
                saveState();
            }
            if (data.type === 'loadState') {
                loadState(data.data);
                setOnline(data.online);
                setPalette(data.palette || []);
                setIsInit(true);

                let privateRoom = localStorage.getItem('private-room');

                if (!privateRoom && data.privateRoom) {
                    localStorage.setItem('private-room', data.privateRoom);
                    privateRoom = data.privateRoom;
                }

                if (privateRoom && token === 'default') {
                    toast.info(
                        `Want to start drawing in a private room?`,
                        {
                            icon: <QuestionMarkCircleIcon />,
                            duration: 20000,
                            position: 'bottom-center',
                            action: {
                                label: "Yes",
                                onClick: () => {
                                    window.location.href = `/?token=${privateRoom}`;
                                },
                            },
                        }
                    );
                }
            }
            if (data.type === 'setOnline') {
                setOnline(data.online);
            }
        };

        setWs(socket);
    };

    const attemptReconnect = () => {
        reconnectAttempts.current += 1;

        const retryDelay = Math.min(1000 * reconnectAttempts.current, 10000);

        console.log(`Attempting to reconnect (#${reconnectAttempts.current}) in ${retryDelay / 1000} seconds...`);

        retryTimeout.current = setTimeout(() => {
            connectWebSocket();
        }, retryDelay);
    };

    const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
    };

    const startDragging = (event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
        if (('touches' in event && event.touches.length === 2) || ('button' in event && event.button === 2)) {
            setIsDrawing(false);
            setIsDragging(true);

            let container = canvasContainerRef.current;

            if (container) {
                const position = 'touches' in event ? getPagePosition(event) : { x: event.pageX, y: event.pageY };
                setStartDraggingX(position.x - container.offsetLeft);
                setScrollLeft(container.scrollLeft);
                setStartDraggingY(position.y - container.offsetTop);
                setScrollTop(container.scrollTop);
            }
        }

        if ('touches' in event && event.touches.length === 2) {
            setPinchDistance(getPinchDistance(event));
        }
    };

    const drag = (event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        let container = canvasContainerRef.current;

        if (container) {
            const speed = 3;
            const position = 'touches' in event ? getPagePosition(event) : { x: event.pageX, y: event.pageY };
            container.scrollLeft = scrollLeft - (position.x - container.offsetLeft - startDraggingX) * speed;
            container.scrollTop = scrollTop - (position.y - container.offsetTop - startDraggingY) * speed;
        }

        if ('touches' in event) {
            const distance = getPinchDistance(event);
            if (Math.abs(pinchDistance - distance) > 5) {
                if (distance > pinchDistance) {
                    zooming('up', 2);
                } else {
                    zooming('down', 2);
                }
            }
            setPinchDistance(distance);
        }
    };

    const stopDragging = () => {
        setIsDragging(false);
    };

    const startDrawing = (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
        switch (tool) {
            case 'pencil':
                if (('touches' in event && event.touches.length === 1) || ('button' in event && event.button === 0)) {
                    setIsDrawing(true);
                }
                break;
            case 'eye-dropper':
                if (context) {
                    const position = getPosition(event);
                    let p = context.getImageData(position.x, position.y, 1, 1).data;
                    setColor("#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6));
                    setTool('pencil');
                }
                break;
        }
    };

    const rgbToHex = (r: number, g: number, b: number) => {
        if (r > 255 || g > 255 || b > 255)
            throw "Invalid color component";
        return ((r << 16) | (g << 8) | b).toString(16);
    }

    const draw = (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !context || !ws) return;

        const position = getPosition(event);

        ws.send(JSON.stringify({ type: 'draw', x: position.x, y: position.y, color, range }));

        drawCircle(position.x, position.y, color, range);
    };

    const drawCircle = (centerX: number, centerY: number, color: string, radius: number) => {
        if (context) {
            context.beginPath();
            context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
            context.fillStyle = color;
            context.fill();
        }
    };

    const stopDrawing = (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !context || !ws) return;

        if ('clientX' in event || 'clientY' in event) {
            draw(event);
        }
        if (ws) {
            ws.send(JSON.stringify({ type: 'save' }));
        }
        setIsDrawing(false);
        saveState();
    };

    const getPosition = (event: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>) => {
        return 'touches' in event ? getTouchPosition(event) : { x: event.nativeEvent.offsetX / (zoom.current / 100), y: event.nativeEvent.offsetY / (zoom.current / 100) };
    }

    const getTouchPosition = (event: TouchEvent<HTMLElement>) => {
        const touch = event.touches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        return {
            x: (touch.clientX - (rect?.left || 0)) / (zoom.current / 100),
            y: (touch.clientY - (rect?.top || 0)) / (zoom.current / 100),
        };
    };

    const getPagePosition = (event: TouchEvent<HTMLCanvasElement> | TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        return {
            x: touch.pageX - (rect?.left || 0),
            y: touch.pageY - (rect?.top || 0),
        };
    };

    const startZooming: React.WheelEventHandler<HTMLDivElement> = (event) => {
        zooming(event.deltaY > 0 ? 'down' : 'up', 5);

        if (zoom.current !== maxZoom && zoom.current !== minZoom) {
            let container = canvasContainerRef.current;

            if (container) {
                const scale = zoom.current / 100;

                const relativeX = (event.clientX - container.offsetLeft + container.scrollLeft) / scale;
                const relativeY = (event.clientY - container.offsetTop + container.scrollTop) / scale;

                const centerX = (relativeX * scale) - (container.clientWidth / 2);
                const centerY = (relativeY * scale) - (container.clientHeight / 2);

                container.scrollTo({
                    left: centerX,
                    top: centerY
                });
            }
        }
    };

    const zooming = (direction: string, zoomSpeed: number = 10) => {
        if (direction === 'up' && zoom.current < maxZoom) {
            zoom.current += zoomSpeed;
        }

        if (direction === 'down' && zoom.current > minZoom) {
            zoom.current -= zoomSpeed;
        }

        if (zoom.current < minZoom) {
            zoom.current = minZoom;
        }

        if (zoom.current > maxZoom) {
            zoom.current = maxZoom;
        }

        setZoomPercent(zoom.current);
    };

    const getPinchDistance = (event: TouchEvent<HTMLDivElement>) => {
        if (event.touches && event.touches.length === 2) {
            return Math.hypot(
                event.touches[0].pageX - event.touches[1].pageX,
                event.touches[0].pageY - event.touches[1].pageY
            );
        }
        return 0;
    };

    const handleColorChange = (value:string) => {
        setColor(value);
    };

    const handleRangeChange = (value:number) => {
        setRange(value);
    };

    const handleReferenceOpacity = (event: React.ChangeEvent<HTMLInputElement>) => {
        setReferenceOpacity(parseInt(event.target.value));
    };

    const saveState = () => {
        if (context) {
            const canvas = canvasRef.current;
            if (canvas) {
                const data = canvas.toDataURL();

                if (ws) {
                    ws.send(JSON.stringify({ type: 'saveState', data: data }));
                }
            }
        }
    };

    const loadState = (data:string) => {
        if (context) {
            let img = new window.Image;
            if (data != null) {
                img.src = data;
            }
            img.onload = function () {
                context.reset();
                context.drawImage(img, 0, 0);
            };
        }
    }

    const clearState = (sync:boolean) => {
        if (sync && ws) {
            ws.send(JSON.stringify({ type: 'clear' }));
        }
        if (context) {
            context.reset();
            context.rect(0, 0, width, height);
            context.fill();
            if (sync) {
                saveState();
            }
        }
    }

    const manuallyClearState = () => {
        clearState(true);
    }

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            let a = document.createElement("a");
            a.href = canvas.toDataURL();
            a.download = "canvas.png";
            a.click();
        }
    }

    const handleView = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            setViewModal(true);
            setViewImage(canvas.toDataURL());
        }
    }

    const handleEyeDropper = () => {
        setTool(tool === 'pencil' ? 'eye-dropper' : 'pencil');
    }

    return (
        <div className="main-container">
            <Modal show={viewModal} size="7xl" onClose={() => setViewModal(false)} popup>
                <Modal.Header />
                <Modal.Body>
                    <div className="text-center">
                        <div className="flex mb-5 relative">
                            <Image
                                className="preview"
                                src={viewImage}
                                width={width}
                                height={height}
                                style={{width: '100%', height: '100%'}}
                                alt="Preview"
                            />
                            <>
                                {reference && (
                                    <Image
                                        className="reference"
                                        onError={() => {
                                            setReference(false)
                                        }}
                                        src={`/references/${token}.jpg`}
                                        width={width}
                                        height={height}
                                        style={{width: '100%', height: '100%', opacity: referenceOpacity / 100}}
                                        alt="Reference"
                                    />
                                )}
                            </>
                        </div>
                        <>
                            {reference && (
                                <input
                                    className="mb-5"
                                    type="range"
                                    value={referenceOpacity}
                                    onChange={handleReferenceOpacity}
                                    min="0"
                                    max="100"
                                />
                            )}
                        </>
                        <div className="flex justify-center gap-4">
                            <Button color="gray" onClick={handleDownload}>
                                <ArrowDownTrayIcon className="size-6"/>
                            </Button>
                            <Button color="gray" onClick={() => setViewModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
            <>
                {isInit ? (
                    <div>
                        <Controls
                            tool={tool}
                            palette={palette}
                            color={color}
                            range={range}
                            onColorChange={handleColorChange}
                            onRangeChange={handleRangeChange}
                            onView={handleView}
                            onEyeDropper={handleEyeDropper}
                            onClear={manuallyClearState}
                        />
                        <Online online={online} />
                        <Bell topic={token}/>
                    </div>
                ) : (
                    <div className="absolute flex justify-center items-center w-dvw h-dvh">
                        <Spinner aria-label="Loading..." size="xl" />
                    </div>
                )}
            </>
            <div
                ref={canvasContainerRef}
                onMouseDown={startDragging}
                onMouseMove={drag}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
                onTouchStart={startDragging}
                onTouchMove={drag}
                onTouchEnd={stopDragging}
                onWheel={startZooming}
                className="canvas-container"
                onContextMenu={handleContextMenu}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    width={width}
                    height={height}
                    onContextMenu={handleContextMenu}
                    style={{'width': width, 'height': height, 'backgroundColor': '#000000', 'zoom': `${zoomPercent}%`}}
                />
            </div>
        </div>
    );
};

export default DrawingCanvas;