
import { splitMessage } from './string.utils';

describe('splitMessage', () => {
  it('should return empty array for empty string', () => {
    expect(splitMessage('')).toEqual([]);
  });

  it('should return single chunk for short string', () => {
    const text = 'Hello world';
    expect(splitMessage(text)).toEqual(['Hello world']);
  });

  it('should split by newlines when possible', () => {
    const text = 'Line 1\nLine 2';
    // Limit is small enough to force split
    // "Line 1" is 6 chars. "Line 2" is 6 chars. 
    // "Line 1\nLine 2" is 13 chars.
    // If max is 10. 
    expect(splitMessage(text, 10)).toEqual(['Line 1', 'Line 2']);
  });

  it('should respect max length', () => {
    const text = '1234567890';
    expect(splitMessage(text, 5)).toEqual(['12345', '67890']);
  });
  
  it('should handle long lines by splitting space', () => {
      const text = "hello world how are you";
      // say max 6.
      // "hello" (5) -> current="hello"
      // "hello world" (11) -> push "hello", current="world"
      // "world how" (9) -> push "world", current="how"
      // "how are" (7) -> push "how", current="are"
      // "are you" (7) -> push "are", current="you"
      expect(splitMessage(text, 6)).toEqual(['hello', 'world', 'how', 'are', 'you']);
  });

   it('should handle really long words', () => {
       const text = "a".repeat(10);
       expect(splitMessage(text, 5)).toEqual(['aaaaa', 'aaaaa']);
   });
   
   it('should keep paragraphs together if they fit', () => {
       const p1 = "a".repeat(100);
       const p2 = "b".repeat(100);
       // 200 + 1 newline = 201.
       // Max 250.
       expect(splitMessage(`${p1}\n${p2}`, 250)).toEqual([`${p1}\n${p2}`]);
   });

   it('should split paragraphs if combined they exceed', () => {
       const p1 = "a".repeat(100);
       const p2 = "b".repeat(100);
       // Max 150.
       expect(splitMessage(`${p1}\n${p2}`, 150)).toEqual([p1, p2]);
   });
});
