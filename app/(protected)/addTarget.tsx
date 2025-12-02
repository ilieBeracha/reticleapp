import {
  shouldSubmitForTraining,
  submitTrainingData,
  TrainingDataPayload
} from "@/services/detectionService";
import {
  addTargetWithPaperResult,
  addTargetWithTacticalResult,
  PaperType
} from "@/services/sessionService";
import { useDetectionStore } from "@/store/detectionStore";
import type { AnalyzeResponse, Detection } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Line } from "react-native-svg";
import ViewShot from "react-native-view-shot";

type TargetType = "paper" | "tactical";
type Step = "form" | "camera" | "preview" | "analyzing" | "results" | "tactical_results";

const DISTANCE_PRESETS = [25, 50, 100, 200, 300, 500];
const BULLET_PRESETS = [1, 3, 5, 10];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// OPTION CHIP
// ============================================================================
const OptionChip = React.memo(function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ============================================================================
// CUSTOM INPUT
// ============================================================================
const CustomInput = React.memo(function CustomInput({
  value,
  onChangeText,
  placeholder,
  unit,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  unit?: string;
}) {
  return (
    <View style={styles.customInputContainer}>
      <TextInput
        style={styles.customInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        keyboardType="number-pad"
        returnKeyType="done"
      />
      {unit && <Text style={styles.customInputUnit}>{unit}</Text>}
    </View>
  );
});

// ============================================================================
// DETECTION EDITOR - Interactive Canvas for Correcting AI Detections
// ============================================================================

interface EditableDetection extends Detection {
  id: string;
  isManual: boolean;
}

const CANVAS_SIZE = SCREEN_WIDTH - 40;
const MARKER_RADIUS = 12;

const DetectionEditor = React.memo(function DetectionEditor({
  result,
  detections,
  onDetectionsChange,
  editMode,
  onModeChange,
  captureRef,
}: {
  result: AnalyzeResponse;
  detections: EditableDetection[];
  onDetectionsChange: (detections: EditableDetection[]) => void;
  editMode: 'add' | 'remove';
  onModeChange: (mode: 'add' | 'remove') => void;
  captureRef?: React.RefObject<ViewShot | null>;
}) {
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Calculate scale factor from original image to canvas
  const scale = useMemo(() => {
    if (!result.metadata) return { x: 1, y: 1, offsetX: 0, offsetY: 0, displayWidth: CANVAS_SIZE, displayHeight: CANVAS_SIZE };
    const imgAspect = result.metadata.width / result.metadata.height;
    const canvasAspect = CANVAS_SIZE / CANVAS_SIZE;
    
    if (imgAspect > canvasAspect) {
      // Image is wider - fit to width
      const displayWidth = CANVAS_SIZE;
      const displayHeight = CANVAS_SIZE / imgAspect;
      return {
        x: displayWidth / result.metadata.width,
        y: displayHeight / result.metadata.height,
        offsetY: (CANVAS_SIZE - displayHeight) / 2,
        offsetX: 0,
        displayWidth,
        displayHeight,
      };
    } else {
      // Image is taller - fit to height
      const displayHeight = CANVAS_SIZE;
      const displayWidth = CANVAS_SIZE * imgAspect;
      return {
        x: displayWidth / result.metadata.width,
        y: displayHeight / result.metadata.height,
        offsetX: (CANVAS_SIZE - displayWidth) / 2,
        offsetY: 0,
        displayWidth,
        displayHeight,
      };
    }
  }, [result.metadata]);

  const handleCanvasTap = useCallback((evt: any) => {
    // Handle both press events and touch events
    const touch = evt.nativeEvent.changedTouches?.[0] || evt.nativeEvent;
    const locationX = touch.locationX ?? touch.pageX;
    const locationY = touch.locationY ?? touch.pageY;
    
    if (locationX === undefined || locationY === undefined) {
      console.log('[Editor] No touch coordinates found');
      return;
    }
    
    // Convert tap coordinates to original image coordinates
    const imgX = (locationX - (scale.offsetX || 0)) / scale.x;
    const imgY = (locationY - (scale.offsetY || 0)) / scale.y;
    
    console.log('[Editor] Tap at canvas:', locationX, locationY, '-> image:', imgX, imgY, 'mode:', editMode);
    
    if (editMode === 'add') {
      // Add new detection at tap location
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newDetection: EditableDetection = {
        id: `manual-${Date.now()}`,
        bbox: [imgX - 15, imgY - 15, imgX + 15, imgY + 15],
        center: [imgX, imgY],
        confidence: 1.0, // Manual additions are 100% confidence
        isManual: true,
      };
      console.log('[Editor] Adding detection:', newDetection.id);
      onDetectionsChange([...detections, newDetection]);
    } else {
      // Check if tap is near any detection to remove it
      const tapRadius = 30 / scale.x; // Tap tolerance in original image pixels
      const tappedIndex = detections.findIndex(d => {
        const dx = d.center[0] - imgX;
        const dy = d.center[1] - imgY;
        return Math.sqrt(dx * dx + dy * dy) < tapRadius;
      });
      
      if (tappedIndex !== -1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newDetections = [...detections];
        newDetections.splice(tappedIndex, 1);
        console.log('[Editor] Removed detection at index:', tappedIndex);
        onDetectionsChange(newDetections);
      }
    }
  }, [detections, editMode, onDetectionsChange, scale]);

  const handleMarkerTap = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDetections = [...detections];
    newDetections.splice(index, 1);
    onDetectionsChange(newDetections);
  }, [detections, onDetectionsChange]);

  return (
    <View style={editorStyles.container}>
      {/* Mode Toggle */}
      <View style={editorStyles.modeToggle}>
        <TouchableOpacity
          style={[editorStyles.modeBtn, editMode === 'remove' && editorStyles.modeBtnActive]}
          onPress={() => onModeChange('remove')}
        >
          <Ionicons 
            name="remove-circle" 
            size={18} 
            color={editMode === 'remove' ? '#000' : 'rgba(255,255,255,0.6)'} 
          />
          <Text style={[editorStyles.modeBtnText, editMode === 'remove' && editorStyles.modeBtnTextActive]}>
            Remove
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[editorStyles.modeBtn, editMode === 'add' && editorStyles.modeBtnActive]}
          onPress={() => onModeChange('add')}
        >
          <Ionicons 
            name="add-circle" 
            size={18} 
            color={editMode === 'add' ? '#000' : 'rgba(255,255,255,0.6)'} 
          />
          <Text style={[editorStyles.modeBtnText, editMode === 'add' && editorStyles.modeBtnTextActive]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={editorStyles.hint}>
        {editMode === 'add' 
          ? 'Tap anywhere to add missed bullet holes'
          : 'Tap a marker to remove false detections'}
      </Text>

      {/* Interactive Canvas */}
      <View style={editorStyles.canvasContainer}>
        {/* ViewShot for capturing the edited image - NOT touchable */}
        <ViewShot 
          ref={captureRef} 
          options={{ format: 'jpg', quality: 0.9, result: 'base64' }}
          style={editorStyles.viewShotInner}
        >
          {/* Base Image */}
          <Image
            source={{ uri: `data:image/jpeg;base64,${result.original_image_base64}` }}
            style={editorStyles.canvasImage}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
          />
          
          {/* SVG Overlay for Detection Markers */}
          {imageLoaded && (
            <View style={editorStyles.svgOverlay}>
              <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
                {detections.map((detection, index) => {
                  // Convert detection center to canvas coordinates
                  const cx = detection.center[0] * scale.x + (scale.offsetX || 0);
                  const cy = detection.center[1] * scale.y + (scale.offsetY || 0);
                  
                  // Color based on confidence or manual
                  let color = '#10B981'; // High confidence / manual
                  if (!detection.isManual) {
                    if (detection.confidence < 0.4) color = '#EF4444';
                    else if (detection.confidence < 0.6) color = '#F59E0B';
                  }
                  
                  return (
                    <G key={detection.id}>
                      {/* Outer glow ring */}
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={MARKER_RADIUS + 6}
                        fill="none"
                        stroke={color}
                        strokeWidth={1}
                        opacity={0.3}
                      />
                      {/* Main ring - just outline, no fill */}
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={MARKER_RADIUS}
                        fill="none"
                        stroke={color}
                        strokeWidth={2.5}
                        opacity={0.9}
                      />
                      {/* Corner brackets instead of full circle - more visibility */}
                      <Line x1={cx - MARKER_RADIUS - 4} y1={cy - 2} x2={cx - MARKER_RADIUS - 4} y2={cy + 2} stroke={color} strokeWidth={2} opacity={0.8} />
                      <Line x1={cx + MARKER_RADIUS + 4} y1={cy - 2} x2={cx + MARKER_RADIUS + 4} y2={cy + 2} stroke={color} strokeWidth={2} opacity={0.8} />
                      <Line x1={cx - 2} y1={cy - MARKER_RADIUS - 4} x2={cx + 2} y2={cy - MARKER_RADIUS - 4} stroke={color} strokeWidth={2} opacity={0.8} />
                      <Line x1={cx - 2} y1={cy + MARKER_RADIUS + 4} x2={cx + 2} y2={cy + MARKER_RADIUS + 4} stroke={color} strokeWidth={2} opacity={0.8} />
                      {/* Manual additions: crosshair */}
                      {detection.isManual && (
                        <>
                          <Line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="#fff" strokeWidth={1.5} opacity={0.8} />
                          <Line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#fff" strokeWidth={1.5} opacity={0.8} />
                        </>
                      )}
                    </G>
                  );
                })}
              </Svg>
            </View>
          )}
        </ViewShot>

        {/* Invisible touch layer on top - handles all taps */}
        <View 
          style={editorStyles.touchLayer}
          onStartShouldSetResponder={() => true}
          onResponderRelease={handleCanvasTap}
        />

        {/* Tap targets for removal (larger touch area) */}
        {editMode === 'remove' && detections.map((detection, index) => {
          const cx = detection.center[0] * scale.x + (scale.offsetX || 0);
          const cy = detection.center[1] * scale.y + (scale.offsetY || 0);
          
          return (
            <TouchableOpacity
              key={`tap-${detection.id}`}
              style={[
                editorStyles.tapTarget,
                {
                  left: cx - 20,
                  top: cy - 20,
                }
              ]}
              onPress={() => handleMarkerTap(index)}
            />
          );
        })}
      </View>
    </View>
  );
});

// ============================================================================
// DETECTION RESULT CARD (with Editor)
// ============================================================================
const ResultCard = React.memo(function ResultCard({
  result,
  onDone,
  onRetake,
  saving,
  editedDetections,
  onDetectionsChange,
}: {
  result: AnalyzeResponse;
  onDone: (finalDetections: EditableDetection[], editedImageBase64?: string) => void;
  onRetake: () => void;
  saving: boolean;
  editedDetections: EditableDetection[];
  onDetectionsChange: (detections: EditableDetection[]) => void;
}) {
  const [editMode, setEditMode] = useState<'add' | 'remove'>('add'); // Default: ADD mode
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  
  // Ref for capturing the edited image
  const editorCaptureRef = useRef<ViewShot>(null);
  
  // Store captured image when modal closes
  const [capturedEditedImage, setCapturedEditedImage] = useState<string | null>(null);
  
  // Animation for modal
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  // Handle editor toggle with animation
  const handleToggleEditor = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!editingEnabled) {
      setEditingEnabled(true);
      setEditorModalVisible(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setEditorModalVisible(false);
        setEditingEnabled(false);
      });
    }
  }, [editingEnabled, scaleAnim, opacityAnim]);

  const handleCloseEditor = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Capture the edited image BEFORE closing the modal (while ViewShot is still mounted)
    if (editorCaptureRef.current) {
      try {
        const capturedBase64 = await (editorCaptureRef.current as any).capture();
        if (capturedBase64) {
          setCapturedEditedImage(capturedBase64);
          console.log('[AddTarget] Captured edited image on modal close, length:', capturedBase64.length);
        }
      } catch (err) {
        console.log('[AddTarget] Could not capture edited image on close:', err);
      }
    }
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setEditorModalVisible(false);
      setEditingEnabled(false);
    });
  }, [scaleAnim, opacityAnim]);
  
  // Calculate stats from edited detections
  const stats = useMemo(() => {
    const total = editedDetections.length;
    const high = editedDetections.filter(d => d.isManual || d.confidence >= 0.6).length;
    const medium = editedDetections.filter(d => !d.isManual && d.confidence >= 0.4 && d.confidence < 0.6).length;
    const low = editedDetections.filter(d => !d.isManual && d.confidence < 0.4).length;
    const manual = editedDetections.filter(d => d.isManual).length;
    
    return { total, high, medium, low, manual };
  }, [editedDetections]);

  const hasChanges = useMemo(() => {
    return editedDetections.length !== result.detections.length ||
      editedDetections.some(d => d.isManual);
  }, [editedDetections, result.detections]);

  // Handle save with the captured edited image
  const handleSave = useCallback(async () => {
    // Use the image captured when the user closed the editor modal
    const editedImageBase64 = hasChanges ? capturedEditedImage || undefined : undefined;
    
    if (hasChanges && editedImageBase64) {
      console.log('[AddTarget] Saving with edited image, length:', editedImageBase64.length);
    } else if (hasChanges) {
      console.log('[AddTarget] Saving with changes but no captured image');
    }
    
    onDone(editedDetections, editedImageBase64);
  }, [editedDetections, hasChanges, capturedEditedImage, onDone]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.resultsContent}>
      {/* Header */}
      <View style={editorStyles.header}>
        <Text style={editorStyles.title}>Review Detections</Text>
        <Text style={editorStyles.subtitle}>AI detected bullet holes</Text>
      </View>

      {/* View-Only Preview: Show image with markers */}
      <View style={editorStyles.viewOnlyContainer}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${result.original_image_base64}` }}
          style={editorStyles.viewOnlyImage}
          resizeMode="contain"
        />
        {/* Overlay markers on image */}
        <View style={editorStyles.markersOverlay}>
          <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
            {editedDetections.map((detection) => {
              // Calculate scale for overlay
              const imgAspect = result.metadata ? result.metadata.width / result.metadata.height : 1;
              const canvasAspect = 1;
              let scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0;
              if (imgAspect > canvasAspect) {
                const displayWidth = CANVAS_SIZE;
                const displayHeight = CANVAS_SIZE / imgAspect;
                scaleX = displayWidth / (result.metadata?.width || 1);
                scaleY = displayHeight / (result.metadata?.height || 1);
                offsetY = (CANVAS_SIZE - displayHeight) / 2;
              } else {
                const displayHeight = CANVAS_SIZE;
                const displayWidth = CANVAS_SIZE * imgAspect;
                scaleX = displayWidth / (result.metadata?.width || 1);
                scaleY = displayHeight / (result.metadata?.height || 1);
                offsetX = (CANVAS_SIZE - displayWidth) / 2;
              }
              const cx = detection.center[0] * scaleX + offsetX;
              const cy = detection.center[1] * scaleY + offsetY;
              
              // Color by confidence/manual
              let color = '#10B981';
              if (!detection.isManual) {
                if (detection.confidence < 0.4) color = '#EF4444';
                else if (detection.confidence < 0.6) color = '#F59E0B';
              }
              
              return (
                <G key={detection.id}>
                  <Circle cx={cx} cy={cy} r={MARKER_RADIUS + 4} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
                  <Circle cx={cx} cy={cy} r={MARKER_RADIUS} fill="none" stroke={color} strokeWidth={2.5} />
                  {/* Show crosshair for manual additions */}
                  {detection.isManual && (
                    <>
                      <Line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke="#fff" strokeWidth={1.5} />
                      <Line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke="#fff" strokeWidth={1.5} />
                    </>
                  )}
                </G>
              );
            })}
          </Svg>
        </View>
      </View>

      {/* Edit Toggle Button */}
      <TouchableOpacity
        style={editorStyles.editToggle}
        onPress={handleToggleEditor}
        activeOpacity={0.7}
      >
        <View style={[editorStyles.editToggleIcon, editingEnabled && editorStyles.editToggleIconActive]}>
          <Ionicons name="pencil" size={16} color={editingEnabled ? '#000' : 'rgba(255,255,255,0.6)'} />
        </View>
        <Text style={editorStyles.editToggleText}>
          {editingEnabled ? 'Editing...' : 'Edit Detections'}
        </Text>
        <Ionicons name="expand-outline" size={18} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>

      {/* Editor Modal (grows from center) */}
      <Modal
        visible={editorModalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseEditor}
      >
        <Animated.View 
          style={[
            editorStyles.editorModalOverlay,
            { opacity: opacityAnim }
          ]}
        >
          <Pressable style={editorStyles.editorModalBackdrop} onPress={handleCloseEditor} />
          <Animated.View 
            style={[
              editorStyles.editorModalContent,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              }
            ]}
          >
            {/* Modal Header */}
            <View style={editorStyles.editorModalHeader}>
              <Text style={editorStyles.editorModalTitle}>Edit Detections</Text>
              <TouchableOpacity onPress={handleCloseEditor} style={editorStyles.editorModalClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* Detection Editor */}
            <DetectionEditor
              result={result}
              detections={editedDetections}
              onDetectionsChange={onDetectionsChange}
              editMode={editMode}
              onModeChange={setEditMode}
              captureRef={editorCaptureRef}
            />
            
            {/* Stats in Modal */}
            <View style={editorStyles.editorModalStats}>
              <Text style={editorStyles.editorModalStatsText}>
                {stats.total} hits • {stats.manual} added manually
              </Text>
            </View>
            
            {/* Done Button */}
            <TouchableOpacity 
              style={editorStyles.editorModalDone}
              onPress={handleCloseEditor}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color="#000" />
              <Text style={editorStyles.editorModalDoneText}>Done Editing</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Live Stats */}
      <View style={editorStyles.statsContainer}>
        <View style={editorStyles.mainStat}>
          <Text style={editorStyles.mainStatValue}>{stats.total}</Text>
          <Text style={editorStyles.mainStatLabel}>
            Total Hits{hasChanges ? ' (edited)' : ''}
          </Text>
        </View>
        
        <View style={editorStyles.statsDivider} />
        
        <View style={editorStyles.breakdownStats}>
          <View style={editorStyles.breakdownRow}>
            <View style={[editorStyles.statDot, { backgroundColor: '#10B981' }]} />
            <Text style={editorStyles.breakdownText}>{stats.high - stats.manual} AI</Text>
          </View>
          {stats.manual > 0 && (
            <View style={editorStyles.breakdownRow}>
              <View style={[editorStyles.statDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={editorStyles.breakdownText}>{stats.manual} Manual</Text>
            </View>
          )}
          {stats.medium > 0 && (
            <View style={editorStyles.breakdownRow}>
              <View style={[editorStyles.statDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={editorStyles.breakdownText}>{stats.medium} Med</Text>
            </View>
          )}
          {stats.low > 0 && (
            <View style={editorStyles.breakdownRow}>
              <View style={[editorStyles.statDot, { backgroundColor: '#EF4444' }]} />
              <Text style={editorStyles.breakdownText}>{stats.low} Low</Text>
            </View>
          )}
        </View>
      </View>

      {/* Change Indicator */}
      {hasChanges && (
        <View style={editorStyles.changeIndicator}>
          <Ionicons name="pencil" size={14} color="#3B82F6" />
          <Text style={editorStyles.changeText}>
            {result.detections.length > editedDetections.length
              ? `Removed ${result.detections.length - editedDetections.length + stats.manual} false detection${result.detections.length - editedDetections.length + stats.manual !== 1 ? 's' : ''}`
              : stats.manual > 0
                ? `Added ${stats.manual} missed bullet${stats.manual !== 1 ? 's' : ''}`
                : 'Detections modified'}
          </Text>
        </View>
      )}

      {/* Processing Info */}
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.4)" />
        <Text style={styles.infoText}>
          AI processed in {result.processing_time_s.toFixed(2)}s
        </Text>
      </View>

      {/* Actions */}
      <TouchableOpacity 
        style={styles.doneButton} 
        onPress={handleSave} 
        activeOpacity={0.9}
        disabled={saving}
      >
        <LinearGradient
          colors={saving ? ["#6B7280", "#9CA3AF"] : ["#10B981", "#34D399"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.doneButtonGradient}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#000" />
              <Text style={styles.doneButtonText}>
                {stats.total === 0 ? 'Save (No Hits)' : `Save ${stats.total} Hit${stats.total !== 1 ? 's' : ''}`}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.retakeButton} 
        onPress={onRetake} 
        activeOpacity={0.7}
        disabled={saving}
      >
        <Ionicons name="camera-outline" size={18} color="rgba(255,255,255,0.6)" />
        <Text style={styles.retakeButtonText}>Retake Photo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

// Editor-specific styles
const editorStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: '#10B981',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  modeBtnTextActive: {
    color: '#000',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginBottom: 12,
  },
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    alignSelf: 'center',
  },
  viewShotInner: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  touchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: 'transparent',
  },
  canvasImage: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  tapTarget: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  mainStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#10B981',
  },
  mainStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  statsDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
  },
  breakdownStats: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  changeText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  // View-only mode styles
  viewOnlyContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    alignSelf: 'center',
    marginBottom: 16,
  },
  viewOnlyImage: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  markersOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  // Edit toggle styles
  editToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  editToggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToggleIconActive: {
    backgroundColor: '#10B981',
  },
  editToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  editTogglePill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 2,
    justifyContent: 'center',
  },
  editTogglePillActive: {
    backgroundColor: '#10B981',
  },
  editToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  editToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  // Editor Modal styles
  editorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  editorModalContent: {
    width: SCREEN_WIDTH - 24,
    maxHeight: '90%',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  editorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  editorModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  editorModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorModalStats: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  editorModalStatsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  editorModalDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  editorModalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

// ============================================================================
// TACTICAL RESULTS ENTRY
// ============================================================================
const TacticalResultsEntry = React.memo(function TacticalResultsEntry({
  distance,
  plannedRounds,
  hits,
  setHits,
  time,
  setTime,
  stageCleared,
  setStageCleared,
  notes,
  setNotes,
  onSave,
  onBack,
  saving,
}: {
  distance: number;
  plannedRounds: number;
  hits: string;
  setHits: (val: string) => void;
  time: string;
  setTime: (val: string) => void;
  stageCleared: boolean;
  setStageCleared: (val: boolean) => void;
  notes: string;
  setNotes: (val: string) => void;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  const hitsNum = parseInt(hits) || 0;
  const accuracyPct = plannedRounds > 0 ? Math.round((hitsNum / plannedRounds) * 100) : 0;

  return (
    <ScrollView 
      style={styles.scrollView} 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Log Results</Text>
          <Text style={styles.headerSubtitle}>Tactical target at {distance}m</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Summary Card */}
      <View style={styles.tacticalSummary}>
        <View style={styles.tacticalSummaryItem}>
          <Text style={styles.tacticalSummaryValue}>{plannedRounds}</Text>
          <Text style={styles.tacticalSummaryLabel}>Rounds</Text>
        </View>
        <View style={styles.tacticalSummaryDivider} />
        <View style={styles.tacticalSummaryItem}>
          <Text style={[styles.tacticalSummaryValue, { color: "#10B981" }]}>{hitsNum}</Text>
          <Text style={styles.tacticalSummaryLabel}>Hits</Text>
        </View>
        <View style={styles.tacticalSummaryDivider} />
        <View style={styles.tacticalSummaryItem}>
          <Text style={[styles.tacticalSummaryValue, accuracyPct >= 80 ? { color: "#10B981" } : accuracyPct >= 50 ? { color: "#F59E0B" } : { color: "#EF4444" }]}>
            {accuracyPct}%
          </Text>
          <Text style={styles.tacticalSummaryLabel}>Accuracy</Text>
        </View>
      </View>

      {/* Hits Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hits on Target</Text>
        <View style={styles.hitsInputRow}>
          {[0, 1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.hitChip,
                hits === num.toString() && styles.hitChipSelected,
              ]}
              onPress={() => setHits(num.toString())}
            >
              <Text style={[styles.hitChipText, hits === num.toString() && styles.hitChipTextSelected]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customInputContainer}>
          <TextInput
            style={styles.customInput}
            value={hits}
            onChangeText={setHits}
            placeholder={`Custom (max ${plannedRounds})`}
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="number-pad"
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Time Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Engagement Time <Text style={styles.optionalLabel}>(optional)</Text>
        </Text>
        <View style={styles.customInputContainer}>
          <TextInput
            style={styles.customInput}
            value={time}
            onChangeText={setTime}
            placeholder="e.g. 4.5"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Text style={styles.customInputUnit}>sec</Text>
        </View>
      </View>

      {/* Stage Cleared Toggle */}
      <View style={styles.toggleSection}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>Stage Cleared</Text>
          <Text style={styles.toggleHint}>Did you complete the tactical stage?</Text>
        </View>
        <Switch
          value={stageCleared}
          onValueChange={setStageCleared}
          trackColor={{ false: "rgba(255,255,255,0.1)", true: "#10B98140" }}
          thumbColor={stageCleared ? "#10B981" : "#6B7280"}
        />
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Notes <Text style={styles.optionalLabel}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes about this target..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={onSave} 
        activeOpacity={0.9} 
        disabled={saving || !hits}
      >
        <LinearGradient
          colors={saving || !hits ? ["#6B7280", "#9CA3AF"] : ["#10B981", "#34D399", "#6EE7B7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.addButtonGradient}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#000" />
              <Text style={styles.addButtonText}>Save Target</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onBack} activeOpacity={0.7} disabled={saving}>
        <Text style={styles.cancelButtonText}>Back to Setup</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AddTargetSheet() {
  const { sessionId, defaultTargetType, defaultDistance } = useLocalSearchParams<{
    sessionId: string;
    defaultTargetType?: string;
    defaultDistance?: string;
  }>();

  // Camera
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Detection store
  const { status: detectionStatus, result, analyze, setImage, startCapture, reset: resetDetection, setError } = useDetectionStore();

  // Local state
  const [step, setStep] = useState<Step>("form");
  const [targetType, setTargetType] = useState<TargetType>((defaultTargetType as TargetType) || "paper");
  const [selectedDistance, setSelectedDistance] = useState<number | null>(defaultDistance ? parseInt(defaultDistance) : 100);
  const [customDistance, setCustomDistance] = useState("");
  const [selectedBullets, setSelectedBullets] = useState<number | null>(5);
  const [customBullets, setCustomBullets] = useState("");
  const [laneNumber, setLaneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  
  // Tactical results state
  const [tacticalHits, setTacticalHits] = useState("");
  const [tacticalTime, setTacticalTime] = useState("");
  const [stageCleared, setStageCleared] = useState(false);
  const [tacticalNotes, setTacticalNotes] = useState("");
  
  // Paper results state (for manual override)
  const [paperType, setPaperType] = useState<PaperType>("grouping");
  const [paperNotes, setPaperNotes] = useState("");
  
  // Editable detections state (for correcting AI results)
  const [editedDetections, setEditedDetections] = useState<EditableDetection[]>([]);

  // Computed
  const effectiveDistance = customDistance ? parseInt(customDistance) : selectedDistance ?? 100;
  const effectiveBullets = customBullets ? parseInt(customBullets) : selectedBullets ?? 5;

  // Handlers
  const handleTargetTypeChange = useCallback((type: TargetType) => {
    Haptics.selectionAsync();
    setTargetType(type);
  }, []);

  const handleDistanceSelect = useCallback((distance: number) => {
    Haptics.selectionAsync();
    setSelectedDistance(distance);
    setCustomDistance("");
  }, []);

  const handleBulletsSelect = useCallback((bullets: number) => {
    Haptics.selectionAsync();
    setSelectedBullets(bullets);
    setCustomBullets("");
  }, []);

  const handleCustomDistanceChange = useCallback((text: string) => {
    setCustomDistance(text);
    if (text) setSelectedDistance(null);
  }, []);

  const handleCustomBulletsChange = useCallback((text: string) => {
    setCustomBullets(text);
    if (text) setSelectedBullets(null);
  }, []);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetDetection();
    router.back();
  }, [resetDetection]);

  // Submit form - opens camera for paper, goes to results entry for tactical
  const handleSubmit = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (targetType === "paper") {
      // Open camera for paper targets
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert("Camera Permission", "Camera access is required to scan paper targets.");
          return;
        }
      }
      startCapture();
      setStep("camera");
    } else {    
      // Tactical: validate fields and go to results entry
      const distance = effectiveDistance;
      const bullets = effectiveBullets;

      if (!distance || distance <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Invalid Distance", "Please enter a valid distance.");
        return;
      }

      if (!bullets || bullets <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Invalid Bullets", "Please enter a valid number of bullets.");
        return;
      }

      // Go to tactical results entry
      setStep("tactical_results");
    }
  }, [targetType, effectiveDistance, effectiveBullets, permission, requestPermission]);

  // Pick image from gallery
  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCapturedUri(result.assets[0].uri);
      setImage(result.assets[0].uri);
      setStep("preview");
    }
  }, [setImage]);

  // Take photo - goes to preview
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setImage(photo.uri);
        setStep("preview");
      }
    } catch (err: any) {
      console.error("Capture failed:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to capture photo");
      Alert.alert("Error", "Failed to capture photo");
    }
  }, [setImage, setError]);

  // Submit photo for analysis
  const handleSubmitPhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("analyzing");

    const analysisResult = await analyze();
    
    if (analysisResult) {
      // Initialize editable detections from AI results
      const initialDetections: EditableDetection[] = analysisResult.detections.map((d, i) => ({
        ...d,
        id: `ai-${i}`,
        isManual: false,
      }));
      setEditedDetections(initialDetections);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("results");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Analysis Failed", "Could not analyze the image. Please try again.", [
        { text: "Retake", onPress: () => setStep("camera") },
        { text: "Cancel", onPress: handleClose },
      ]);
    }
  }, [analyze, handleClose]);

  // Save paper target with edited detection results
  const savePaperTarget = useCallback(async (finalDetections: EditableDetection[], editedImageBase64?: string) => {
    if (!sessionId) {
      Alert.alert("Error", "Session ID missing");
      return;
    }

    setSaving(true);

    try {
      // Calculate stats from edited detections
      const detectionCount = finalDetections.length;
      const rawHighConfHits = finalDetections.filter(d => d.isManual || d.confidence >= 0.6).length;
      // Cap hits to not exceed bullets fired
      const highConfHits = Math.min(rawHighConfHits, effectiveBullets);
      const manualCount = finalDetections.filter(d => d.isManual).length;
      
      // Build edited stats
      const editedStats = {
        high: finalDetections.filter(d => d.isManual || d.confidence >= 0.6).length,
        medium: finalDetections.filter(d => !d.isManual && d.confidence >= 0.4 && d.confidence < 0.6).length,
        low: finalDetections.filter(d => !d.isManual && d.confidence < 0.4).length,
        manual: manualCount,
      };
      
      // If user edited the detections, store the user-corrected image for display/training
      // Priority: editedImageBase64 (user-edited) > annotated_image_base64 (AI-generated)
      const finalImageBase64 = editedImageBase64 || result?.annotated_image_base64;
      
      // Store training data if user made corrections (for model improvement)
      const trainingData = manualCount > 0 || finalDetections.length !== (result?.detections?.length ?? 0) ? {
        original_image_base64: result?.original_image_base64,
        edited_image_base64: editedImageBase64,
        original_detections: result?.detections,
        final_detections: finalDetections.map(d => ({
          center: d.center,
          bbox: d.bbox,
          confidence: d.confidence,
          is_manual: d.isManual,
        })),
        edits: {
          added: manualCount,
          removed: (result?.detections?.length ?? 0) - finalDetections.length + manualCount,
        },
      } : null;
      
      const saveParams = {
        session_id: sessionId,
        distance_m: effectiveDistance,
        lane_number: laneNumber ? parseInt(laneNumber) : null,
        planned_shots: effectiveBullets,
        notes: paperNotes || null, // target-level notes
        target_data: null, // Training data sent to Python backend instead (smaller DB)
        paper_type: paperType,
        bullets_fired: effectiveBullets,
        hits_total: Math.min(detectionCount, effectiveBullets),
        hits_inside_scoring: highConfHits,
        dispersion_cm: null,
        // Use user-edited image if available, otherwise AI-annotated
        scanned_image_url: finalImageBase64 
          ? `data:image/jpeg;base64,${finalImageBase64}` 
          : null,
        result_notes: paperNotes || null, // result-level notes (same)
      };
      
      console.log('[AddTarget] Saving paper target with params:', {
        session_id: saveParams.session_id,
        distance_m: saveParams.distance_m,
        lane_number: saveParams.lane_number,
        bullets_fired: saveParams.bullets_fired,
        hits_total: saveParams.hits_total,
        hits_inside_scoring: saveParams.hits_inside_scoring,
        paper_type: saveParams.paper_type,
        has_image: !!saveParams.scanned_image_url,
        has_notes: !!saveParams.notes,
        has_training_data: !!trainingData,
        user_made_edits: !!editedImageBase64,
      });
      
      const savedTarget = await addTargetWithPaperResult(saveParams);
      console.log('[AddTarget] Target saved:', savedTarget.id, 'paper_result:', savedTarget.paper_result);

      // Best-effort: submit corrections to backend for model training
      if (trainingData && shouldSubmitForTraining(trainingData as TrainingDataPayload)) {
        submitTrainingData(trainingData as TrainingDataPayload)
          .then(res => console.log('[Training] Submitted:', res.message))
          .catch(err => console.log('[Training] Failed:', err));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetDetection();
      router.back();
    } catch (error: any) {
      console.error("Failed to add paper target:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to add target");
      setSaving(false);
    }
  }, [sessionId, effectiveDistance, effectiveBullets, laneNumber, result, paperType, paperNotes, resetDetection]);

  // Save tactical target with results
  const saveTacticalTarget = useCallback(async () => {
    if (!sessionId) {
      Alert.alert("Error", "Session ID missing");
      return;
    }

    const hits = parseInt(tacticalHits) || 0;
    const bulletsFired = effectiveBullets;

    // Validate hits don't exceed bullets fired
    if (hits > bulletsFired) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Invalid Hits", "Hits cannot exceed rounds fired.");
      return;
    }

    setSaving(true);

    try {
      await addTargetWithTacticalResult({
        session_id: sessionId,
        distance_m: effectiveDistance,
        lane_number: laneNumber ? parseInt(laneNumber) : null,
        planned_shots: effectiveBullets,
        // Tactical result params
        bullets_fired: bulletsFired,
        hits: hits,
        is_stage_cleared: stageCleared,
        time_seconds: tacticalTime ? parseFloat(tacticalTime) : null,
        result_notes: tacticalNotes || null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetDetection();
      router.back();
    } catch (error: any) {
      console.error("Failed to add tactical target:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to add target");
      setSaving(false);
    }
  }, [sessionId, effectiveDistance, effectiveBullets, laneNumber, tacticalHits, tacticalTime, stageCleared, tacticalNotes, resetDetection]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setEditedDetections([]);
    resetDetection();
    setStep("camera");
  }, [resetDetection]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      {/* Main Content: Results, Tactical Entry, or Form */}
      {step === "results" && result ? (
        <ResultCard 
          result={result} 
          onDone={savePaperTarget} 
          onRetake={handleRetake} 
          saving={saving}
          editedDetections={editedDetections}
          onDetectionsChange={setEditedDetections}
        />
      ) : step === "tactical_results" ? (
        <TacticalResultsEntry
          distance={effectiveDistance}
          plannedRounds={effectiveBullets}
          hits={tacticalHits}
          setHits={setTacticalHits}
          time={tacticalTime}
          setTime={setTacticalTime}
          stageCleared={stageCleared}
          setStageCleared={setStageCleared}
          notes={tacticalNotes}
          setNotes={setTacticalNotes}
          onSave={saveTacticalTarget}
          onBack={() => setStep("form")}
          saving={saving}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Add Target</Text>
              <Text style={styles.headerSubtitle}>Log your shooting target</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Target Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Target Type</Text>
            <View style={styles.targetTypeRow}>
              <TouchableOpacity
                style={[styles.targetTypeCard, targetType === "paper" && styles.targetTypeCardSelected]}
                onPress={() => handleTargetTypeChange("paper")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="ellipse-outline"
                  size={28}
                  color={targetType === "paper" ? "#10B981" : "rgba(255,255,255,0.4)"}
                />
                <Text style={[styles.targetTypeText, targetType === "paper" && styles.targetTypeTextSelected]}>
                  Paper
                </Text>
                <Text style={styles.targetTypeHint}>AI scoring</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.targetTypeCard, targetType === "tactical" && styles.targetTypeCardSelected]}
                onPress={() => handleTargetTypeChange("tactical")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="man-outline"
                  size={28}
                  color={targetType === "tactical" ? "#10B981" : "rgba(255,255,255,0.4)"}
                />
                <Text style={[styles.targetTypeText, targetType === "tactical" && styles.targetTypeTextSelected]}>
                  Tactical
                </Text>
                <Text style={styles.targetTypeHint}>Hit / Miss</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Paper: Just show scan info */}
          {targetType === "paper" && (
            <View style={styles.paperInfo}>
              <View style={styles.paperInfoIcon}>
                <Ionicons name="camera" size={32} color="#10B981" />
              </View>
              <Text style={styles.paperInfoTitle}>AI-Powered Analysis</Text>
              <Text style={styles.paperInfoText}>
                Take a photo of your paper target and our AI will automatically detect and score your bullet holes.
              </Text>
            </View>
          )}

          {/* Tactical: Show all config fields */}
          {targetType === "tactical" && (
            <>
              {/* Distance */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Distance</Text>
                <View style={styles.chipsRow}>
                  {DISTANCE_PRESETS.map((dist) => (
                    <OptionChip
                      key={dist}
                      label={`${dist}m`}
                      selected={selectedDistance === dist && !customDistance}
                      onPress={() => handleDistanceSelect(dist)}
                    />
                  ))}
                </View>
                <CustomInput
                  value={customDistance}
                  onChangeText={handleCustomDistanceChange}
                  placeholder="Custom distance"
                  unit="m"
                />
              </View>

              {/* Bullets */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rounds to Fire</Text>
                <View style={styles.chipsRow}>
                  {BULLET_PRESETS.map((count) => (
                    <OptionChip
                      key={count}
                      label={count.toString()}
                      selected={selectedBullets === count && !customBullets}
                      onPress={() => handleBulletsSelect(count)}
                    />
                  ))}
                </View>
                <CustomInput
                  value={customBullets}
                  onChangeText={handleCustomBulletsChange}
                  placeholder="Custom count"
                  unit="rds"
                />
              </View>

              {/* Lane Number */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Lane Number <Text style={styles.optionalLabel}>(optional)</Text>
                </Text>
                <CustomInput value={laneNumber} onChangeText={setLaneNumber} placeholder="e.g. 5" />
              </View>

              {/* Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="locate" size={18} color="#10B981" />
                    <Text style={styles.summaryLabel}>Type</Text>
                    <Text style={styles.summaryValue}>Tactical</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Ionicons name="resize" size={18} color="#10B981" />
                    <Text style={styles.summaryLabel}>Distance</Text>
                    <Text style={styles.summaryValue}>{effectiveDistance}m</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Ionicons name="radio-button-on" size={18} color="#10B981" />
                    <Text style={styles.summaryLabel}>Rounds</Text>
                    <Text style={styles.summaryValue}>{effectiveBullets}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity style={styles.addButton} onPress={handleSubmit} activeOpacity={0.9} disabled={saving}>
            <LinearGradient
              colors={["#10B981", "#34D399", "#6EE7B7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              {saving ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name={targetType === "paper" ? "camera" : "add-circle"} size={22} color="#000" />
                  <Text style={styles.addButtonText}>
                    {targetType === "paper" ? "Scan Target" : "Add Target"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Camera Flow Modal */}
      <Modal
        visible={step === "camera" || step === "preview" || step === "analyzing"}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => step === "camera" ? setStep("form") : undefined}
      >
        {/* CAMERA VIEW */}
        {step === "camera" && (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back">
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraTopBar}>
                  <TouchableOpacity onPress={() => setStep("form")} style={styles.cameraBackBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.cameraTitle}>Scan Target</Text>
                  <View style={{ width: 40 }} />
                </View>

                <View style={styles.cameraGuide}>
                  {/* Top Left */}
                  <View style={[styles.guideCorner, styles.guideCornerTL]} />
                  {/* Top Right */}
                  <View style={[styles.guideCorner, styles.guideCornerTR]} />
                  {/* Bottom Left */}
                  <View style={[styles.guideCorner, styles.guideCornerBL]} />
                  {/* Bottom Right */}
                  <View style={[styles.guideCorner, styles.guideCornerBR]} />
                </View>

                <View style={styles.cameraInstructions}>
                  <View style={styles.instructionBadge}>
                    <Ionicons name="scan-outline" size={16} color="#10B981" />
                    <Text style={styles.instructionText}>Align target within frame</Text>
                  </View>
                </View>

                <View style={styles.cameraBottomBar}>
                  <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage} activeOpacity={0.7}>
                    <Ionicons name="images-outline" size={24} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.captureButton} onPress={handleCapture} activeOpacity={0.8}>
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>

                  {/* Spacer for alignment */}
                  <View style={{ width: 50 }} />
                </View>
              </View>
            </CameraView>
          </View>
        )}

        {/* PREVIEW VIEW */}
        {step === "preview" && capturedUri && (
          <View style={styles.previewFullContainer}>
            <Image source={{ uri: capturedUri }} style={styles.previewFullImage} resizeMode="cover" />
            <LinearGradient
              colors={["rgba(0,0,0,0.6)", "transparent", "transparent", "rgba(0,0,0,0.8)"]}
              style={styles.previewGradient}
            >
              <View style={styles.previewTopBar}>
                <TouchableOpacity onPress={() => setStep("camera")} style={styles.cameraBackBtn}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.previewTitle}>Review Photo</Text>
                <View style={{ width: 40 }} />
              </View>

              <View style={{ flex: 1 }} />

              <View style={styles.previewActions}>
                <Text style={styles.previewHint}>Make sure the target is clearly visible</Text>
                <TouchableOpacity style={styles.submitPhotoButton} onPress={handleSubmitPhoto} activeOpacity={0.9}>
                  <LinearGradient
                    colors={["#10B981", "#34D399"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitPhotoGradient}
                  >
                    <Ionicons name="scan" size={22} color="#000" />
                    <Text style={styles.submitPhotoText}>Analyze Target</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.retakePhotoButton} onPress={() => setStep("camera")} activeOpacity={0.7}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.retakePhotoText}>Retake</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ANALYZING VIEW */}
        {step === "analyzing" && (
          <View style={styles.analyzingContainer}>
            <View style={styles.analyzingContent}>
              {capturedUri && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
                  <View style={styles.previewOverlay}>
                    <View style={styles.scanLine} />
                  </View>
                </View>
              )}
              <View style={styles.analyzingInfo}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.analyzingTitle}>Analyzing Target</Text>
                <Text style={styles.analyzingSubtitle}>Detecting bullet holes...</Text>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    marginTop: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  headerCenter: { flex: 1, alignItems: "center" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Sections
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionalLabel: {
    fontWeight: "400",
    color: "rgba(255,255,255,0.35)",
    textTransform: "none",
    letterSpacing: 0,
  },

  // Target Type Cards
  targetTypeRow: { flexDirection: "row", gap: 12 },
  targetTypeCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  targetTypeCardSelected: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  targetTypeText: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  targetTypeTextSelected: { color: "#fff" },
  targetTypeHint: { fontSize: 11, color: "rgba(255,255,255,0.35)" },

  // Paper Info
  paperInfo: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 20,
    padding: 32,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  paperInfoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  paperInfoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  paperInfoText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
  },

  // Chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipSelected: { backgroundColor: "#10B981" },
  chipText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  chipTextSelected: { color: "#000" },

  // Custom Input
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  customInput: { flex: 1, fontSize: 16, color: "#fff" },
  customInputUnit: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginLeft: 8 },

  // Summary Card
  summaryCard: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  summaryItem: { alignItems: "center", gap: 6 },
  summaryDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.1)" },
  summaryLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.3 },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#fff" },

  // Add Button
  addButton: { borderRadius: 28, overflow: "hidden", marginBottom: 12 },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  addButtonText: { fontSize: 17, fontWeight: "700", color: "#000" },

  // Cancel Button
  cancelButton: { alignItems: "center", paddingBottom: 20 },
  cancelButtonText: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.5)" },

  // Accuracy Preview
  accuracyPreview: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  accuracyLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5 },
  accuracyValue: { fontSize: 48, fontWeight: "800", color: "#10B981", marginVertical: 4 },
  accuracyHint: { fontSize: 13, color: "rgba(255,255,255,0.5)" },

  // Tactical Summary
  tacticalSummary: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  tacticalSummaryItem: { flex: 1, alignItems: "center" },
  tacticalSummaryValue: { fontSize: 32, fontWeight: "700", color: "#fff" },
  tacticalSummaryLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4, textTransform: "uppercase" },
  tacticalSummaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 12 },

  // Hit Chips
  hitsInputRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  hitChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  hitChipSelected: { backgroundColor: "#10B981" },
  hitChipText: { fontSize: 18, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  hitChipTextSelected: { color: "#000" },

  // Toggle Section
  toggleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
  },
  toggleInfo: { flex: 1, marginRight: 16 },
  toggleTitle: { fontSize: 16, fontWeight: "600", color: "#fff" },
  toggleHint: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  // Notes Input
  notesInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // ============================================================================
  // CAMERA STYLES
  // ============================================================================
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "space-between" },
  cameraTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  cameraBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  cameraGuide: {
    width: SCREEN_WIDTH - 60,
    aspectRatio: 1,
    alignSelf: "center",
    position: "relative",
  },
  guideCorner: {
    position: "absolute",
    width: 50,
    height: 50,
    borderColor: "#10B981",
  },
  guideCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  guideCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  guideCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  guideCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  cameraInstructions: { alignItems: "center", paddingHorizontal: 20 },
  instructionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  instructionText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  cameraBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },

  // ============================================================================
  // PREVIEW STYLES
  // ============================================================================
  previewFullContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewFullImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  previewGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  previewTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  previewActions: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    gap: 12,
  },
  previewHint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 8,
  },
  submitPhotoButton: {
    borderRadius: 28,
    overflow: "hidden",
  },
  submitPhotoGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  submitPhotoText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  retakePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  retakePhotoText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  // ============================================================================
  // ANALYZING STYLES
  // ============================================================================
  analyzingContainer: { flex: 1, backgroundColor: "#0f0f0f", justifyContent: "center", alignItems: "center" },
  analyzingContent: { alignItems: "center", gap: 32 },
  previewContainer: {
    width: SCREEN_WIDTH - 80,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: { width: "100%", height: "100%" },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#10B981",
    top: "50%",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  analyzingInfo: { alignItems: "center", gap: 16 },
  analyzingTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  analyzingSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)" },

  // ============================================================================
  // RESULTS STYLES
  // ============================================================================
  resultsContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  resultsHeader: { alignItems: "center", marginBottom: 24 },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultsTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  resultsSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 4 },
  imageContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  annotatedImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#1a1a1a",
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 36, fontWeight: "800", color: "#10B981" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4, textTransform: "uppercase" },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  confidenceDot: { width: 8, height: 8, borderRadius: 4 },
  confidenceText: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 24,
  },
  infoText: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  doneButton: { borderRadius: 28, overflow: "hidden", marginBottom: 12 },
  doneButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  doneButtonText: { fontSize: 17, fontWeight: "700", color: "#000" },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  retakeButtonText: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
});
