import React from 'react';

const Card = ({ className = '', hover = false, padded = true, children, ...props }) => {
  const classes = [
    'card',
    padded ? 'p-5' : '',
    hover ? 'card-hover' : '',
    className,
  ].join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
