import React, { useState } from "react";
import { Button, Modal } from "flowbite-react";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { EyeDropperIcon, PencilIcon, TrashIcon, ViewfinderCircleIcon } from "@heroicons/react/20/solid";

type Props = {
    tool: string;
    palette: Array<string>;
    color: string;
    range: number;
    onColorChange: (value:string) => void;
    onRangeChange: (value:number) => void;
    onView: () => void;
    onEyeDropper: () => void;
    onClear: () => void;
};

const Online: React.FC<Props> = ({tool, palette, color, range, onColorChange, onRangeChange, onView, onEyeDropper, onClear}) => {
    const [clearModal, setClearModal] = useState<boolean>(false);

    const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onColorChange(event.target.value);
    }

    const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onRangeChange(parseInt(event.target.value));
    }

    const handleClear = () => {
        setClearModal(false)
        onClear();
    }

    return (
        <div>
            <Modal show={clearModal} size="md" onClose={() => setClearModal(false)} popup>
                <Modal.Header />
                <Modal.Body>
                    <div className="text-center">
                        <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
                        <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
                            Are you sure you want to clear canvas?
                        </h3>
                        <div className="flex justify-center gap-4">
                            <Button color="failure" onClick={handleClear}>
                                {"Yes, I'm sure"}
                            </Button>
                            <Button color="gray" onClick={() => setClearModal(false)}>
                                No, cancel
                            </Button>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
            <div className="controls">
                <div className="controls-row">
                    <input
                        type="color"
                        value={color}
                        onChange={handleColorChange}
                        className="mb-4"
                    />
                    <input
                        type="range"
                        value={range}
                        onChange={handleRangeChange}
                        min="1"
                        max="50"
                    />
                    <button onClick={onView}>
                        <ViewfinderCircleIcon className="size-6"/>
                    </button>
                    <button onClick={onEyeDropper}>
                        <>
                            {tool === 'pencil' ? (
                                <PencilIcon className="size-6"/>
                            ) : (
                                <EyeDropperIcon className="size-6"/>
                            )}
                        </>
                    </button>
                    <button onClick={() => setClearModal(true)}>
                        <TrashIcon className="size-6"/>
                    </button>
                </div>
                <>
                    {palette.length > 0 && (
                        <div className="controls-row color-palette">
                            {palette.map((color, i) => {
                                return (
                                    <button key={`color-${i}`} style={{backgroundColor: color}} onClick={() => onColorChange(color)}></button>
                                )
                            })}
                        </div>
                    )}
                </>
            </div>
        </div>
    );
}

export default Online;