import React from 'react';
import clsx from 'clsx';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide' | 'fluid';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'default',
  className,
  ...props
}) => {
  const sizes = {
    narrow: 'max-w-4xl',
    default: 'max-w-[1360px]',
    wide: 'max-w-[1500px]',
    fluid: 'max-w-full',
  };

  return (
    <div
      className={clsx('mx-auto px-3 sm:px-6 w-full', sizes[size], className)}
      {...props}
    >
      {children}
    </div>
  );
};
