import React from "react";

type Props = {
    online: number;
};

const Online: React.FC<Props> = ({online}) => {
    return (
        <div className="online">{online}</div>
    );
}

export default Online;