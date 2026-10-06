import ShearWipeComp from './ShearWipeComp';
interface ShearWipeProps {
  clipPathDuration?: number;
  componentsBgImage?: string;
  componentsTextColor?: string;
  showcaseBgImage?: string;
  showcaseTextColor?: string;
}

const ShearWipe = ({
  clipPathDuration,
  componentsTextColor = 'text-[#0D47A1]',
  showcaseTextColor = 'text-white',
}: ShearWipeProps) => {
  return (
    <ShearWipeComp
      clipPathDuration={clipPathDuration}
      componentsTextColor={componentsTextColor}
      showcaseTextColor={showcaseTextColor}
    />
  );
};

export default ShearWipe;
