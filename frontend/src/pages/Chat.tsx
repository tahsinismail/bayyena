// frontend/src/pages/Chat.tsx

import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { 
  IconButton, 
  TextArea, 
  ScrollArea,
  Button,
} from '@radix-ui/themes';
import { 
  ArrowLeftIcon,
  PaperPlaneIcon,
  ChatBubbleIcon,
  CopyIcon,
  CounterClockwiseClockIcon
} from '@radix-ui/react-icons';
import type { Case, Message } from '../types';
import { getCases, getChatHistory, postChatMessage, clearChatHistory } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
export default function Chat() {
  const [, params] = useRoute("/chat/:caseId?");
  const caseId = params?.caseId;
  const [, setLocation] = useLocation();
  
  const [activeCaseId, setActiveCaseId] = useState<string | null>(caseId || null);
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const messageRefs = useRef<{ [key: number]: HTMLElement }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [, setInputFocused] = useState(false);
  // Scroll-lock helpers for Android Chrome keyboard behavior
//   const scrollLockScrollY = useRef<number | null>(null);
//   const [scrollLockApplied, setScrollLockApplied] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  //const overlayGestureAllowed = useRef<boolean>(false);


    const [viewportHeight, setViewportHeight] = useState<number>(window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const [, setKeyboardHeight] = useState<number>(0);
    const [keyboardOpen, setKeyboardOpen] = useState<boolean>(false);

  const HEADER_HEIGHT = 72; // px — match your header CSS
  const INPUT_HEIGHT_FALLBACK = 84; 
  // Default minimum gap so interactive content never sits directly under the fixed input
  const DEFAULT_INPUT_BOTTOM_BUFFER = 12; // px
  const inputAreaRef = useRef<HTMLDivElement | null>(null);
  const [measuredInputHeight, setMeasuredInputHeight] = useState<number | null>(null);
  const [inputBottomBuffer, setInputBottomBuffer] = useState<number>(DEFAULT_INPUT_BOTTOM_BUFFER);

useEffect(() => {
  const initialHeight = window.innerHeight;

  const onViewportChange = () => {
    const vvHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    setViewportHeight(vvHeight);

    // compute keyboard height (if any)
    const kbHeight = Math.max(0, initialHeight - vvHeight);
    setKeyboardHeight(kbHeight);

    // consider keyboard open if shrunk more than threshold (100px)
    setKeyboardOpen(kbHeight > 100);
  };

  // use visualViewport if available for better accuracy
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
    window.visualViewport.addEventListener('scroll', onViewportChange);
  } else {
    window.addEventListener('resize', onViewportChange);
  }

  // run once to initialize
  onViewportChange();

  return () => {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', onViewportChange);
      window.visualViewport.removeEventListener('scroll', onViewportChange);
    } else {
      window.removeEventListener('resize', onViewportChange);
    }
  };
}, []);

  // Measure the input area's height (textarea + padding) so we can compute
  // exact spacing when the keyboard appears. Re-measure on input changes,
  // visualViewport resize, and window resize.
  useEffect(() => {
    const measure = () => {
      // Prefer explicit inputAreaRef; fall back to querying by class
      const el = inputAreaRef.current || document.querySelector('.gemini-input-area') as HTMLDivElement | null;
      if (el) {
        const h = el.offsetHeight;
        if (h && h !== measuredInputHeight) setMeasuredInputHeight(h);
      }
    };

    measure();

    const onResize = () => measure();

    window.addEventListener('resize', onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize);
      window.visualViewport.addEventListener('scroll', onResize);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onResize);
        window.visualViewport.removeEventListener('scroll', onResize);
      }
    };
  }, [measuredInputHeight, inputValue]);

  // While the virtual keyboard is open on mobile, prevent touchmove from
  // scrolling the document (this prevents the input area from causing page
  // scroll). Allow touchmove inside the messages area so users can still
  // scroll the chat history.
//   useEffect(() => {
//     if (!isMobileView || !keyboardOpen) return;

//     const handler = (e: TouchEvent) => {
//       const target = e.target as Element | null;
//       // Allow scrolling inside messages area
//       if (target && target.closest && target.closest('.gemini-messages')) {
//         return;
//       }
//       // Otherwise prevent the touchmove to stop page/input scrolling
//       e.preventDefault();
//     };

//     document.addEventListener('touchmove', handler, { passive: false });

//     return () => {
//       document.removeEventListener('touchmove', handler);
//     };
//   }, [isMobileView, keyboardOpen]);

//   // When keyboard opens or input gets focus on mobile, ensure the latest
//   // messages are visible by scrolling the messages container to bottom.
//   useEffect(() => {
//     if (!isMobileView) return;

//     const el = messageContainerRef.current;
//     if (!el) return;
//     if (keyboardOpen || inputFocused) {
//       // Small timeout to allow visualViewport adjustments
//       setTimeout(() => {
//         try {
//           el.scrollTop = el.scrollHeight;
//         } catch (err) {
//           // ignore
//         }
//       }, 250);

//       // Apply scroll lock to prevent Android Chrome viewport shifts
//       if (!scrollLockApplied) {
//         const scrollY = window.scrollY || window.pageYOffset || 0;
//         scrollLockScrollY.current = scrollY;
//         document.documentElement.style.position = 'fixed';
//         document.documentElement.style.top = `-${scrollY}px`;
//         document.documentElement.style.width = '100%';
//         setScrollLockApplied(true);
//       }
//     } else {
//       // remove lock when keyboard closed and input not focused
//       if (scrollLockApplied) {
//         const prev = scrollLockScrollY.current || 0;
//         document.documentElement.style.position = '';
//         document.documentElement.style.top = '';
//         document.documentElement.style.width = '';
//         window.scrollTo(0, prev);
//         scrollLockScrollY.current = null;
//         setScrollLockApplied(false);
//       }
//     }
//   }, [isMobileView, keyboardOpen, inputFocused, messages.length]);

  const inputHeight = measuredInputHeight ?? INPUT_HEIGHT_FALLBACK;
  const inputHeightWithBuffer = inputHeight + inputBottomBuffer;

  // Recalculate the bottom buffer whenever the measured input height changes.
  // Use a percentage of the input height but never go below the default.
  useEffect(() => {
    const base = measuredInputHeight ?? INPUT_HEIGHT_FALLBACK;
    const computed = Math.max(DEFAULT_INPUT_BOTTOM_BUFFER, Math.round(base * 0.12));
    setInputBottomBuffer(computed);
  }, [measuredInputHeight]);
  // Copy message text to clipboard
  const copyToClipboard = async (text: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Scroll to user message after AI response is generated
  const scrollToUserMessage = (userMessageId: number) => {
    setTimeout(() => {
      const messageElement = messageRefs.current[userMessageId];
      if (messageElement) {
        messageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        // Brief highlight to show which user message the AI responded to
        messageElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        setTimeout(() => {
          messageElement.style.backgroundColor = '';
        }, 1500);
      }
    }, 100); // Small delay to ensure AI message is rendered
  };

  // Scroll to thinking message when AI starts processing
  const scrollToThinkingMessage = () => {
    setTimeout(() => {
      if (thinkingRef.current) {
        thinkingRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        });
      }
    }, 50); // Small delay to ensure thinking message is rendered
  };

  // Handle back to case/matter
  const handleBackToCase = () => {
    if (activeCaseId) {
      setLocation(`/cases/${activeCaseId}`);
    } else {
      setLocation('/cases');
    }
  };

  // Get messages for the active case only (sorted chronologically for proper display)
  const currentCaseMessages = messages
    .filter(m => activeCaseId ? m.caseId === parseInt(activeCaseId) : false)
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  // Get user messages for the sidebar (sorted latest to oldest for navigation)
  const userMessagesForSidebar = currentCaseMessages
    .filter(m => m.sender === 'user')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Get active case for displaying title
  const activeCase = activeCaseId ? cases.find(c => c.id === parseInt(activeCaseId)) : null;

  // Load cases
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const { data } = await getCases();
        setCases(data);
      } catch (error) {
        console.error('Failed to fetch cases:', error);
      }
    };

    fetchCases();
  }, []);

  // Disable parent and browser level scrolling while on the chat page.
  // This lock prevents page-level scrolling while still allowing the chat's
  // internal scrollable areas ('.gemini-messages', '.gemini-input-area',
  // '.gemini-sidebar') to handle touch/wheel events.
//   useEffect(() => {
//     const docEl = document.documentElement;
//     const bodyEl = document.body;

//     const orig = {
//       docPosition: docEl.style.position || '',
//       docTop: docEl.style.top || '',
//       docWidth: docEl.style.width || '',
//       bodyOverflow: bodyEl.style.overflow || ''
//     };

//     // Save current scroll position and lock the document
//     const scrollY = window.scrollY || window.pageYOffset || 0;
//     docEl.style.position = 'fixed';
//     docEl.style.top = `-${scrollY}px`;
//     docEl.style.width = '100%';
//     bodyEl.style.overflow = 'hidden';

//     const allowScroll = (target: Element | null) => !!(target && (target.closest('.gemini-messages') || target.closest('.gemini-input-area') || target.closest('.gemini-sidebar')));

//     const wheelHandler = (e: WheelEvent) => {
//       const t = e.target as Element | null;
//       if (!allowScroll(t)) {
//         e.preventDefault();
//         e.stopPropagation();
//       }
//     };

//     const touchHandler = (e: TouchEvent) => {
//       const t = e.target as Element | null;
//       if (!allowScroll(t)) {
//         e.preventDefault();
//         e.stopPropagation();
//       }
//     };

//     const keyHandler = (e: KeyboardEvent) => {
//       const scrollKeys = [' ', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
//       const t = e.target as Element | null;
//       if (scrollKeys.includes(e.key) && !allowScroll(t)) {
//         e.preventDefault();
//         e.stopPropagation();
//       }
//     };

//     document.addEventListener('wheel', wheelHandler, { passive: false });
//     document.addEventListener('touchmove', touchHandler, { passive: false });
//     document.addEventListener('keydown', keyHandler, { passive: false });

//     return () => {
//       // Restore styles and scroll
//       document.removeEventListener('wheel', wheelHandler);
//       document.removeEventListener('touchmove', touchHandler);
//       document.removeEventListener('keydown', keyHandler);

//       bodyEl.style.overflow = orig.bodyOverflow;
//       docEl.style.position = orig.docPosition;
//       docEl.style.top = orig.docTop;
//       docEl.style.width = orig.docWidth;
//       // Restore scroll position
//       window.scrollTo(0, scrollY);
//     };
//   }, []);

  // Global guard: allow touch/wheel scrolling only inside chat internal scrollers
//   useEffect(() => {
//     // Returns true if the element (or an ancestor) is inside allowed chat areas
//     const isAllowed = (el: Element | null) => !!(el && (el.closest('.gemini-messages') || el.closest('.gemini-input-area') || el.closest('.gemini-sidebar')));

//     const findScrollableAncestor = (start: Element | null): Element | null => {
//       let el = start;
//       while (el && el !== document.documentElement) {
//         if (el instanceof HTMLElement) {
//           const style = window.getComputedStyle(el);
//           const oy = style.overflowY;
//           if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight) return el;
//         }
//         el = el.parentElement;
//       }
//       return null;
//     };

//     // Uses touch coordinates to determine which underlying element is being interacted with.
//     // This is more reliable on Android where the event.target can be the document or a container.
//     const getUnderlyingElementFromTouch = (touch: Touch | null): Element | null => {
//       if (!touch) return null;
//       try {
//         return document.elementFromPoint(touch.clientX, touch.clientY) as Element | null;
//       } catch (err) {
//         return null;
//       }
//     };

//     let allowScrollForPointer = false;

//     const onTouchStart = (e: TouchEvent) => {
//       const touch = e.touches && e.touches[0] ? e.touches[0] : null;
//       const el = getUnderlyingElementFromTouch(touch);
//       const scrollable = el ? findScrollableAncestor(el) : null;
//       // Allow only if the scrollable ancestor (or the element itself) is inside chat areas
//       allowScrollForPointer = !!((scrollable && isAllowed(scrollable)) || isAllowed(el));
//     };

//     const onTouchMove = (e: TouchEvent) => {
//       const touch = e.touches && e.touches[0] ? e.touches[0] : null;
//       const el = getUnderlyingElementFromTouch(touch);
//       const scrollable = el ? findScrollableAncestor(el) : null;
//       const allowedNow = !!((scrollable && isAllowed(scrollable)) || isAllowed(el));
//       if (!allowedNow && !allowScrollForPointer) {
//         // aggressively prevent any page dragging or parent scroll
//         e.preventDefault();
//         e.stopPropagation();
//       }
//     };

//     const onWheel = (e: WheelEvent) => {
//       const target = e.target as Element | null;
//       const scrollable = findScrollableAncestor(target);
//       if (!(scrollable && isAllowed(scrollable))) {
//         e.preventDefault();
//         e.stopPropagation();
//       }
//     };

//     // Use capture phase where possible so we intercept before other handlers
//     document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true } as AddEventListenerOptions);
//     document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true } as AddEventListenerOptions);
//     document.addEventListener('wheel', onWheel, { passive: false, capture: true } as AddEventListenerOptions);

//     return () => {
//       document.removeEventListener('touchstart', onTouchStart, { capture: true } as EventListenerOptions);
//       document.removeEventListener('touchmove', onTouchMove, { capture: true } as EventListenerOptions);
//       document.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
//     };
//   }, []);

  // Aggressive overlay shim: while keyboard is open or input focused on mobile,
  // render a full-screen transparent overlay that captures touches outside
  // the chat internals. It briefly disables its own pointerEvents to inspect
  // the underlying element at touch start, and if that element is an allowed
  // chat scroller, it hides itself for the duration of the gesture so the
  // underlying element receives events normally.
  //   useEffect(() => {
  //     if (!isMobileView) return;

//     const overlay = overlayRef.current;
//     if (!overlay) return;

//     const isAllowedElement = (el: Element | null) => !!(el && (el.closest('.gemini-messages') || el.closest('.gemini-input-area') || el.closest('.gemini-sidebar')));

//     const onTouchStart = (ev: TouchEvent) => {
//       const touch = ev.touches && ev.touches[0] ? ev.touches[0] : null;
//       if (!touch) return;

//       // Temporarily allow pointer events through so we can detect the underlying element
//       try {
//         overlay.style.pointerEvents = 'none';
//         const underneath = document.elementFromPoint(touch.clientX, touch.clientY) as Element | null;
//         // restore overlay capture
//         overlay.style.pointerEvents = 'auto';

//         const allowed = isAllowedElement(underneath);
//         overlayGestureAllowed.current = !!allowed;

//         if (allowed) {
//           // Hide overlay for the duration of this gesture so underlying scroller gets events
//           overlay.style.display = 'none';
//         } else {
//           // Keep overlay visible and prevent default to block page drag
//           ev.preventDefault();
//           ev.stopPropagation();
//         }
//       } catch (err) {
//         // fallback: block
//         overlay.style.pointerEvents = 'auto';
//         overlayGestureAllowed.current = false;
//         ev.preventDefault();
//         ev.stopPropagation();
//       }
//     };

//     const onTouchMove = (ev: TouchEvent) => {
//       if (!overlayGestureAllowed.current) {
//         ev.preventDefault();
//         ev.stopPropagation();
//       }
//     };

//     const onTouchEnd = () => {
//       // restore overlay after gesture ends
//       overlayGestureAllowed.current = false;
//       overlay.style.display = 'block';
//     };

//     // Attach native listeners to the overlay element
//     overlay.addEventListener('touchstart', onTouchStart, { passive: false });
//     overlay.addEventListener('touchmove', onTouchMove, { passive: false });
//     overlay.addEventListener('touchend', onTouchEnd);
//     overlay.addEventListener('touchcancel', onTouchEnd);

//     return () => {
//       overlay.removeEventListener('touchstart', onTouchStart);
//       overlay.removeEventListener('touchmove', onTouchMove);
//       overlay.removeEventListener('touchend', onTouchEnd);
//       overlay.removeEventListener('touchcancel', onTouchEnd);
//     };
  //   }, [isMobileView, keyboardOpen, inputFocused]);

  // Simple global scroll lock: block all wheel/touch/keyboard scrolling unless
  // the event originates inside the chat messages area ('.gemini-messages').
  // This is a compact, high-confidence guard that avoids complex heuristics.
  useEffect(() => {
    const isInsideMessages = (target: EventTarget | null) => {
      if (!target) return false;
      if (target instanceof Element) {
        return !!target.closest('.gemini-messages');
      }
      return false;
    };

    const wheelHandler = (e: WheelEvent) => {
      if (!isInsideMessages(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const touchMoveHandler = (e: TouchEvent) => {
      const touch = e.touches && e.touches[0] ? e.touches[0] : null;
      const el = touch ? document.elementFromPoint(touch.clientX, touch.clientY) : null;
      if (!isInsideMessages(el)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const keyHandler = (e: KeyboardEvent) => {
      const scrollKeys = ['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (scrollKeys.includes(e.key) && !isInsideMessages(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Always register wheel and touch handlers. Register key handler only on non-mobile.
    document.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
    document.addEventListener('touchmove', touchMoveHandler, { passive: false, capture: true });
    if (!isMobileView) {
      document.addEventListener('keydown', keyHandler, { passive: false, capture: true });
    }

    return () => {
      document.removeEventListener('wheel', wheelHandler, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchmove', touchMoveHandler, { capture: true } as EventListenerOptions);
      if (!isMobileView) {
        document.removeEventListener('keydown', keyHandler, { capture: true } as EventListenerOptions);
      }
    };
  }, [isMobileView]);

  // Handle responsive design
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640); // md breakpoint
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Note: mobile keyboard sizing and layout is handled reactively by the
  // visualViewport measurement above and by the inline JSX styles that use
  // `keyboardOpen`, `keyboardHeight` and `viewportHeight`. Direct DOM
  // manipulation here caused bugs (and referenced an undefined variable).
  // Removing that DOM-heavy effect prevents race conditions with mobile
  // keyboards and lets React-driven styles handle layout.

  // Load messages when case changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeCaseId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      try {
        const messagesResponse = await getChatHistory(activeCaseId);
        setMessages(messagesResponse.data || []);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [activeCaseId]);

  // Update active case ID when route parameter changes
  useEffect(() => {
    setActiveCaseId(caseId || null);
  }, [caseId]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (textareaRef.current && inputValue === '') {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue]);

  // Scroll to specific message (keep this for manual navigation from sidebar)
  const scrollToMessage = (messageId: number) => {
    setSelectedMessageId(messageId);
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
      // Highlight the message briefly
      messageElement.style.backgroundColor = 'rgba(133, 106, 0, 0.1)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  // Filter cases based on search
  const filteredCases = cases.filter(caseItem =>
    caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    caseItem.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCaseSelect = (caseId: number) => {
    setActiveCaseId(caseId.toString());
    setSelectedMessageId(null);
    setLocation(`/chat/${caseId}`);
    // Close mobile sidebar when case is selected
    if (isMobileView) {
      setShowMobileSidebar(false);
    }
  };

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  // Clear chat history
  const handleClearChat = async () => {
    if (!activeCaseId || currentCaseMessages.length === 0) return;
    
    const confirmClear = window.confirm('Are you sure you want to clear all messages in this conversation? This action cannot be undone.');
    if (!confirmClear) return;

    setIsClearingChat(true);
    try {
      await clearChatHistory(activeCaseId);
      
      // Remove messages from local state
      setMessages(prevMessages => 
        prevMessages.filter(m => m.caseId !== parseInt(activeCaseId))
      );

      console.log('Chat history cleared successfully');
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      alert('Failed to clear chat history. Please try again.');
    } finally {
      setIsClearingChat(false);
    }
  };

  // Utility function to detect RTL text (Arabic)
  const isRTLText = (text: string): boolean => {
    // Arabic Unicode range: U+0600-U+06FF, U+0750-U+077F, U+08A0-U+08FF, U+FB50-U+FDFF, U+FE70-U+FEFF
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;
    
    // Remove HTML tags, markdown, and special characters for better detection
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_`~#\-+.\d\s]/g, '');
    
    // Check if Arabic characters make up a significant portion of the text (>30%)
    const arabicMatches = cleanText.match(new RegExp(arabicRegex, 'gu'));
    const arabicCount = arabicMatches ? arabicMatches.length : 0;
    const totalLetters = cleanText.replace(/[^\p{L}]/gu, '').length;
    
    return totalLetters > 0 && (arabicCount / totalLetters) > 0.3;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeCaseId || isSending) return;

    const messageText = inputValue.trim();
    
    setInputValue('');
    setIsSending(true);
    setIsThinking(true);

    // Create user message with current timestamp
    const now = new Date();
    const userMessageId = Date.now();
    const userMessage: Message = {
      id: userMessageId,
      caseId: parseInt(activeCaseId),
      sender: 'user',
      text: messageText,
      createdAt: now.toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Scroll to thinking message when AI starts processing
    scrollToThinkingMessage();

    try {
      const response = await postChatMessage(activeCaseId, messageText);
      
      // Small delay to ensure user message is rendered before adding AI message
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Add AI response with timestamp that ensures it comes after user message
      const aiMessage: Message = {
        id: userMessageId + 1, // Ensure AI message ID is after user message ID
        caseId: parseInt(activeCaseId),
        sender: 'bot',
        text: response.data.answer,
        createdAt: new Date(now.getTime() + 1000).toISOString() // 1 second after user message
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Scroll to the user message after AI response is generated
      scrollToUserMessage(userMessageId);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsSending(false);
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle @ context for file references - show all case documents
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    setInputValue(value);
    adjustTextareaHeight();
  };

  // Handle input focus for mobile keyboard
  const handleInputFocus = () => {
    setInputFocused(true);
    if (isMobileView && textareaRef.current) {
      // Wait for keyboard to appear, then scroll input into view
      setTimeout(() => {
        const inputContainer = textareaRef.current?.closest('.gemini-input-area');
        if (inputContainer) {
          inputContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
        }
      }, 400); // Increased delay to ensure keyboard is fully shown
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white !overflow-hidden">
      {/* Chat container - full viewport */}
      <div 
        className="gemini-chat-container flex flex-col bg-white h-full !overflow-hidden relative"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      >
        {/* Touch-blocking overlay for mobile keyboard/gesture handling. Visible
            only when keyboard is open or input is focused; covers non-chat
            areas to prevent page dragging. */}
        <div
          ref={el => { overlayRef.current = el }}
          aria-hidden="true"
        //   style={{
        //     // Only show overlay while the input is actually focused. Relying on
        //     // keyboardOpen alone lets the overlay accidentally cover the
        //     // messages area (causing no-scroll). Input focus is a better signal.
        //     display: (keyboardOpen || inputFocused) ? 'block' : 'none',
        //     position: 'fixed',
        //     inset: 0,
        //     zIndex: 15,
        //     background: 'transparent',
        //     // overlay captures touches; allow pointer-events to be toggled by handlers
        //     pointerEvents: 'auto'
        //   }}
        />
        {/* Fixed Header */}
        <div className="gemini-header fixed top-0 left-0 right-0 z-60 flex items-center justify-between px-3 md:px-6 py-4 bg-white border-b border-gray-200">
          <div className="w-full flex items-center gap-3 justify-between">
            {/* Back to Matter Button */}
            <Button
              variant="ghost"
              size="2"
              onClick={handleBackToCase}
              className="hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon /> Back to Matter
            </Button>
            
            {/* Mobile menu button */}
            {isMobileView && activeCaseId && (
              <Button
                variant="ghost"
                size="2"
                onClick={toggleMobileSidebar}
                className="hover:bg-gray-100 transition-colors md:hidden"
              >
                <CounterClockwiseClockIcon /> History
              </Button>
            )}
          </div>

          
        </div>

        {/* Main Content - with spacing for fixed header and bottom input */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile Sidebar Overlay */}
          {isMobileView && showMobileSidebar && (
            <div 
              className="absolute inset-0 bg-white z-40 md:hidden"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}
          
          {/* Left Sidebar - Matter Selection */}
          <div 
            className={`gemini-sidebar ${
              isMobileView 
                ? `fixed left-0 top-0 bottom-0 z-50 transform transition-transform duration-300 ${
                    showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
                  } w-80 md:relative md:transform-none md:translate-x-0`
                : sidebarCollapsed ? 'w-16 pt-14 z-50' : 'w-80 pt-14 z-50'
            } flex flex-col transition-all duration-300 bg-white border-r border-gray-200`}
          >
            
            {(!sidebarCollapsed || isMobileView) && (
              <>
                {/* Search and New Chat */}
                <div className="p-4 space-y-3">
                  
                  {/* Close button for mobile */}
                  {isMobileView && (
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {activeCaseId ? 'Messages' : 'Legal Matters'}
                      </h3>
                      <IconButton
                        variant="ghost"
                        size="2"
                        onClick={() => setShowMobileSidebar(false)}
                        className="hover:bg-gray-100 transition-colors"
                      >
                        ×
                      </IconButton>
                    </div>
                  )}

                  {/* Clear Chat Button */}
                  {activeCaseId && currentCaseMessages.length > 0 && (
                    <div className='w-full flex justify-end'>
                      <Button
                        variant="soft"
                        color='gray'
                        size="2"
                        onClick={handleClearChat}
                        disabled={isClearingChat}
                        className="bg-red-50 text-red-600 transition-colors"
                      >
                        {isClearingChat ? (
                          <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>🗑️ Clear Chat</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Dynamic Content: Cases or Messages */}
                <ScrollArea 
                  className="gemini-messages flex-1 px-2"
                  onScroll={(e) => {
                    // Prevent scroll events from bubbling up
                    e.stopPropagation();
                  }}
                  style={{
                    overscrollBehavior: 'contain'
                  }}
                >
                  <div className="space-y-4 py-2">
                    {activeCaseId ? (
                      /* Show user messages for active case */
                      userMessagesForSidebar.length > 0 ? (
                        userMessagesForSidebar.map((message) => (
                          <div
                            key={message.id}
                            onClick={() => { message.id && scrollToMessage(message.id); isMobileView && setShowMobileSidebar(!isMobileView) }}
                            className={`gemini-message-item p-3 cursor-pointer rounded-lg transition-all ${
                              selectedMessageId === message.id ? 'active' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="gemini-message-avatar w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                                👤
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 line-clamp-2 leading-5">
                                  {message.text.length > 60 ? `${message.text.substring(0, 60)}...` : message.text}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {message.createdAt ? format(new Date(message.createdAt), 'MMM d, h:mm a') : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-gray-400 text-sm">No messages yet</div>
                        </div>
                      )
                    ) : (
                      /* Show cases when no case is selected */
                      filteredCases.map((caseItem) => (
                        <div
                          key={caseItem.id}
                          onClick={() => handleCaseSelect(caseItem.id)}
                          className="gemini-case-item p-3 cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="gemini-case-avatar w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm">
                              ⚖️
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm leading-5 text-gray-900">
                                {caseItem.title}
                              </h3>
                              {caseItem.caseNumber && (
                                <p className="text-xs text-gray-500 mt-1">#{caseItem.caseNumber}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <ChatBubbleIcon className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {messages.filter(m => m.caseId === caseItem.id).length} messages
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Collapse Toggle - Hidden on mobile */}
            {!isMobileView && (
              <div className="p-2 border-t border-gray-200">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="gemini-collapse-btn w-full p-2 text-sm font-medium transition-colors"
                >
                  {sidebarCollapsed ? '→' : '←'}
                </button>
              </div>
            )}
          </div>

          {/* Main Chat Area */}
          <div 
            className="gemini-chat-main flex-1 flex flex-col min-w-0"
            style={{
              position: 'relative',
              overflow: 'hidden',
              height: '100%'
            }}
          >
            {/* Messages Area */}
      <div 
    ref={el => { messageContainerRef.current = el as HTMLDivElement }}
    className="gemini-messages flex-1 overflow-y-auto"
          style={{
          // when keyboardOpen use visual viewport height so the container doesn't extend under keyboard
          height: keyboardOpen
            ? `${viewportHeight - HEADER_HEIGHT - (inputHeightWithBuffer)}px`
            : `calc(100vh - ${HEADER_HEIGHT}px - ${inputHeightWithBuffer}px)`,
          overflowY: 'auto',
          paddingTop: keyboardOpen
            ? `${viewportHeight - HEADER_HEIGHT}px`:`${HEADER_HEIGHT}px`,
          // Add extra bottom padding to ensure no interactive element sits under the input
          // When keyboard is open we still want a buffer equal to the input height + small gap,
          // not a huge viewport-based value which can make the list non-scrollable.
          paddingBottom: `${HEADER_HEIGHT + inputHeightWithBuffer}px`,
          // if you want content to start below header
          overscrollBehavior: 'contain'
  }}

              onScroll={(e) => {
                // Prevent scroll events from bubbling up
                e.stopPropagation();
              }}
              onWheel={(e) => {
                // Allow scrolling within messages area but prevent propagation
                e.stopPropagation();
              }}
            >
              <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 p-2">
                {messagesLoading ? (
                  <div className="gemini-empty-state flex justify-center py-8">
                    <div className="gemini-loading-spinner w-6 h-6"></div>
                  </div>
                ) : currentCaseMessages.length === 0 ? (
                  <div className="gemini-welcome flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="gemini-welcome-logo w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-sm">
                        ⚖️
                      </div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Legal AI Assistant</h2>
                      <p className="text-gray-600 mb-8">
                        {activeCase ? `How can I assist you with ${activeCase.title}?` : 'How can I assist you today?'}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="gemini-feature-card p-4">
                          <div className="text-2xl mb-2">📄</div>
                          <div className="font-medium">Document Analysis</div>
                          <div className="text-gray-600">Review and analyze legal documents</div>
                        </div>
                        <div className="gemini-feature-card p-4">
                          <div className="text-2xl mb-2">🔍</div>
                          <div className="font-medium">Legal Research</div>
                          <div className="text-gray-600">Get research assistance and guidance</div>
                        </div>
                        <div className="gemini-feature-card p-4">
                          <div className="text-2xl mb-2">📝</div>
                          <div className="font-medium">Document Drafting</div>
                          <div className="text-gray-600">Draft legal documents and contracts</div>
                        </div>
                        <div className="gemini-feature-card p-4">
                          <div className="text-2xl mb-2">🎯</div>
                          <div className="font-medium">Case Strategy</div>
                          <div className="text-gray-600">Develop case strategies and plans</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Display messages in chronological order (oldest to newest) for chat */}
                    {currentCaseMessages.map((message) => (
                      <div
                        key={message.id}
                        ref={(el) => {
                          if (el && message.id) {
                            messageRefs.current[message.id] = el;
                          }
                        }}
                        className={`group flex gap-2 md:gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : ''} ${
                          selectedMessageId === message.id ? 'ring-2 ring-[#856A00]/30 rounded-lg p-1' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`gemini-message-avatar w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs md:text-sm ${
                          message.sender === 'user' 
                            ? 'gemini-user-avatar text-white' 
                            : 'gemini-bot-avatar text-white'
                        }`}>
                          {message.sender === 'user' ? '👤' : '⚖️'}
                        </div>

                        {/* Message Content */}
                        <div className={`flex-1 max-w-3xl ${message.sender === 'user' ? 'text-right' : ''}`}>
                          <div className={`gemini-message-bubble inline-block p-3 md:p-4 ${
                            message.sender === 'user'
                              ? 'gemini-user-bubble'
                              : 'gemini-bot-bubble'
                          }`}>
                            <div 
                              className="prose prose-sm"
                              dir={isRTLText(message.text) ? 'rtl' : 'ltr'}
                              style={{
                                textAlign: isRTLText(message.text) ? 'right' : 'left',
                                direction: isRTLText(message.text) ? 'rtl' : 'ltr'
                              }}
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.text}
                              </ReactMarkdown>
                            </div>
                          </div>
                          
                          <div className={`flex items-center justify-between mt-1 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`text-xs text-gray-500 ${message.sender === 'user' ? 'text-right' : ''}`}>
                              {message.createdAt ? format(new Date(message.createdAt), 'MMM d, h:mm a') : ''}
                            </div>
                            
                            {/* Copy button for AI messages */}
                            {message.sender === 'bot' && message.id && (
                              <IconButton
                                variant="ghost"
                                size="1"
                                onClick={() => copyToClipboard(message.text, message.id!)}
                                className="opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all ml-2"
                                title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
                              >
                                {copiedMessageId === message.id ? (
                                  <span className="text-[#856A00] text-xs">✓</span>
                                ) : (
                                  <CopyIcon className="w-3 h-3" />
                                )}
                              </IconButton>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Thinking Message */}
                    {isThinking && (
                      <div 
                        ref={thinkingRef}
                        className="flex gap-4"
                      >
                        {/* AI Avatar */}
                        <div className="gemini-message-avatar w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 gemini-bot-avatar text-white text-xs md:text-sm">
                          🤖
                        </div>
                        
                        {/* Thinking Content */}
                        <div className="flex-1 max-w-3xl">
                          <div className="gemini-message-bubble gemini-bot-bubble inline-block p-3 md:p-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-xs md:text-sm">Bayyena is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Fixed Input Area */}
            <div 
              ref={el => { inputAreaRef.current = el }}
        className="gemini-input-area mx-auto fixed bottom-0 left-0 right-0 p-2 bg-white border-t border-gray-100"
          style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 40,
            overscrollBehavior: 'contain',
            // Prevent gesture-based scrolling starting from the input area
            // so touches on the input won't be interpreted as page scrolls.
            touchAction: 'none',
            pointerEvents: 'auto'
            }}
            onTouchStart={(e) => { e.stopPropagation(); }}
            onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragStart={(e) => { e.preventDefault(); }}
            onWheel={(e) => { e.stopPropagation(); }}
            >
              <div className={`max-w-5xl ${sidebarCollapsed ? 'md:pl-0': 'md:pl-80'} mx-auto relative`}>
                <div className="gemini-input-container flex items-end gap-2 md:gap-3 p-2">
                  <div className="flex-1">
                    <TextArea
                      variant='surface'
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      onInput={adjustTextareaHeight}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      onDragStart={(e) => { e.preventDefault(); }}
                      placeholder={activeCaseId ? "Ask me anything about this legal matter..." : "Select a matter to start chatting..."}
                      disabled={isSending || !activeCaseId}
                      rows={1}
                      dir={isRTLText(inputValue) ? 'rtl' : 'ltr'}
                      style={{
                        textAlign: isRTLText(inputValue) ? 'right' : 'left',
                        direction: isRTLText(inputValue) ? 'rtl' : 'ltr',
                        border: 'none',
                        outline: 'none',
                        boxShadow: 'none',
                        maxHeight: '160px',
                        overflowY: 'hidden',
                        // Ensure the textarea itself does not trigger touch scrolling
                        touchAction: 'none',
                        pointerEvents: 'auto'
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isSending || !activeCaseId}
                      className="gemini-send-btn w-10 h-10 flex items-center justify-center"
                    >
                      {isSending ? (
                        <div className="gemini-loading-spinner w-4 h-4 border-white" />
                      ) : (
                        <PaperPlaneIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  AI can make mistakes. Consider checking important information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}