// components/ShowImage.tsx
import React from 'react';
import { BasePropertyProps } from 'adminjs';

const ShowImage: React.FC<BasePropertyProps> = (props) => {
  const { record } = props;
  const filePath = record?.params.files;

  return (
    <div>
      {filePath ? (
        <img src={`/uploads/${filePath}`} alt="Uploaded File" style={{ width: '100%', height: 'auto' }} />
      ) : (
        'No image available'
      )}
    </div>
  );
};

export default ShowImage;
