import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';

type Variant = 'concave' | 'wave' | 'arc';

type Props = {
  width: number;
  height?: number;
  fill?: string;
  variant?: Variant;
  useGradient?: boolean;
};

const STROKE_WIDTH = 2.5;

/**
 * Header bottom: curved edge (white cutout) + thin gradient line along the curve.
 * The gradient (Howard blue → red) is only on the thin arc line, not the fill.
 */
export default function HeaderWaveDivider({
  width,
  height = 32,
  fill = '#fff',
  variant = 'concave',
  useGradient = true,
}: Props) {
  const w = width;
  const h = height;

  const dip = h * 0.22;

  // Filled shape (white cutout so header has curved bottom)
  const concavePath = `M 0 0 C ${w * 0.25} ${dip} ${w * 0.75} ${dip} ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  const wavePath = `M 0 0 Q ${w * 0.25} ${h * 0.2} ${w * 0.5} 0 Q ${w * 0.75} ${h * 0.2} ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  const arcPath = `M 0 0 Q ${w / 2} ${dip} ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  const path = variant === 'wave' ? wavePath : variant === 'arc' ? arcPath : concavePath;

  // Thin arc line only (same curve, no fill — for gradient stroke)
  const concaveLine = `M 0 0 C ${w * 0.25} ${dip} ${w * 0.75} ${dip} ${w} 0`;
  const waveLine = `M 0 0 Q ${w * 0.25} ${h * 0.2} ${w * 0.5} 0 Q ${w * 0.75} ${h * 0.2} ${w} 0`;
  const arcLine = `M 0 0 Q ${w / 2} ${dip} ${w} 0`;
  const strokePath = variant === 'wave' ? waveLine : variant === 'arc' ? arcLine : concaveLine;

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height }} pointerEvents="none">
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', bottom: 0 }}>
        <Defs>
          <LinearGradient id="headerWaveGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={HOWARD_BLUE} stopOpacity="1" />
            <Stop offset="1" stopColor={HOWARD_RED} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* White cutout: header bottom is this curve */}
        <Path d={path} fill={fill} />
        {/* Thin gradient line along the curve */}
        {useGradient && (
          <Path
            d={strokePath}
            fill="none"
            stroke="url(#headerWaveGrad)"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        )}
      </Svg>
    </View>
  );
}
