// ShowImage.tsx

import React from 'react';

interface ShowImageProps {
  record: {
    params: {
      files: string[]; // Fayl nomlari ro'yxati
    };
  };
}

const ShowImage: React.FC<ShowImageProps> = ({ record }) => {
  const { params } = record;
  
  // Fayl nomlarini ro'yxatdan olish
  const fileNames = params.files || [];

  return (
    <div>
      {fileNames.map((fileName, index) => (
        <div key={index}>
          <a className="adminjs-file-link" href={`/api/files/${fileName}`} target="_blank" rel="noopener noreferrer">
            {fileName}
          </a>
        </div>
      ))}
    </div>
  );
};

export default ShowImage;
