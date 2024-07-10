import React from 'react';

const ShowImage = (props) => {
  const { record } = props;
  const imageUrl = record.params.files;

  return (
    <div>
      <img src={imageUrl} alt="Record Image" />
    </div>
  );
};

export default ShowImage;
